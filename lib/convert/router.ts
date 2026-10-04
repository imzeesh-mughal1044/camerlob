/**
 * lib/convert/router.ts
 * Engine selection. Pure logic: it decides which engine should service a pair
 * and in what order, and it never performs a conversion itself.
 *
 * Keeping selection separate from execution is what makes the engine layer
 * swappable. Callers ask for a conversion; they never name an engine.
 *
 * Escalation rule (Documents/TRD.md section 11): E004, E005, E007, E008 and
 * E009 may escalate from client to server, at most once per file. A server
 * failure after escalation is final.
 */

import {
  canBrowserConvert,
  getEngineFallbacks,
  getFallbackEngines,
  isConvertible,
  isConversionSupported,
  resolvePair,
} from '@/lib/convert/formats';
import { ONE_WAY_FORMATS, RAW_FORMATS } from '@/lib/constants/formats';
import { ConversionError, toConversionError } from '@/lib/constants/errors';
import {
  ENGINE_TIMEOUT_MS,
  ENGINE_TIMEOUT_RAW_MS,
  SERVER_MAX_FILE_SIZE_BYTES,
} from '@/lib/constants/limits';
import { convertWithGhostscript } from '@/lib/convert/engines/ghostscript';
import { convertWithImageMagick } from '@/lib/convert/engines/imagemagick';
import { convertWithLibRaw } from '@/lib/convert/engines/libraw';
import { convertWithSharpBuffer } from '@/lib/convert/engines/sharp';
import type { EngineConversionOptions } from '@/types/conversion';
import type { EngineAdapter, EngineKind, EngineName } from '@/types/engine';

/** The ordered plan for one file: try these engines in turn. */
export interface ConversionPlan {
  readonly source: string;
  readonly target: string;
  /** Engines to attempt, in order. Never empty for a valid pair. */
  readonly engines: readonly EngineKind[];
  /** True when the first attempt happens in the browser. */
  readonly startsClientSide: boolean;
  /** True when escalation to the server is permitted for this file. */
  readonly mayEscalate: boolean;
  readonly oneWay: boolean;
  readonly reason: string | null;
}

/** Availability as reported by `/api/health`, used to prune the plan. */
export type EngineAvailabilityMap = Partial<Record<EngineKind, boolean>>;

/**
 * Build the engine plan for a pair.
 *
 * @param source Format identifier the files are in.
 * @param target Format identifier the caller wants out.
 * @param availability Optional probe results. Engines reported unavailable are
 *   removed from the plan, which is how the UI hides server formats on a host
 *   that cannot service them.
 */
export function planConversion(
  source: string,
  target: string,
  availability: EngineAvailabilityMap = {}
): ConversionPlan {
  const pair = resolvePair(source, target);
  const candidates = getEngineFallbacks(pair.source, pair.target);

  const engines = candidates.filter((engine) => availability[engine] !== false);
  if (engines.length === 0) {
    throw new ConversionError('E006', `No available engine for ${pair.source} -> ${pair.target}`, {
      engine: pair.engine,
    });
  }

  const startsClientSide = engines[0]?.startsWith('CLIENT_') ?? false;

  return {
    source: pair.source,
    target: pair.target,
    engines,
    startsClientSide,
    // Too large to escalate: the server ceiling is lower than the client one.
    mayEscalate: startsClientSide,
    oneWay: pair.oneWay,
    reason: pair.reason,
  };
}

/**
 * Decide whether a failed client attempt should be retried on the server.
 *
 * @param plan The plan the file is following.
 * @param error The error the client engine raised.
 * @param fileSizeBytes Size of the file being converted.
 */
export function shouldEscalate(
  plan: ConversionPlan,
  error: ConversionError,
  fileSizeBytes: number
): boolean {
  if (!plan.mayEscalate) return false;
  if (!error.escalatable) return false;
  // E002 is size-driven: a bigger ceiling on the server would be a lie.
  if (fileSizeBytes > SERVER_MAX_FILE_SIZE_BYTES) return false;
  return true;
}

/** First engine in the plan that lives on the server, if any. */
export function firstServerEngine(plan: ConversionPlan): EngineKind | null {
  return plan.engines.find((engine) => engine.startsWith('SERVER_')) ?? null;
}

/** Adapter lookup. Registered by the caller so this module stays dependency-free. */
export type AdapterRegistry = Partial<Record<EngineKind, EngineAdapter>>;

/**
 * Run a plan against a registry, escalating on failure.
 *
 * @param plan Engine order to follow.
 * @param registry Adapters, keyed by engine kind.
 * @param convert Adapter invocation, so the caller controls File/Blob handling.
 * @param fileSizeBytes File size, used for the escalation size check.
 * @returns The successful blob and the engine that produced it.
 */
export async function executePlan(
  plan: ConversionPlan,
  registry: AdapterRegistry,
  convert: (adapter: EngineAdapter, engine: EngineKind) => Promise<Blob>,
  fileSizeBytes: number
): Promise<{ blob: Blob; engine: EngineKind }> {
  let lastError: ConversionError | null = null;
  let attempted = 0;

  for (const engine of plan.engines) {
    const adapter = registry[engine];
    if (!adapter) continue;

    attempted += 1;
    try {
      const blob = await convert(adapter, engine);
      return { blob, engine };
    } catch (thrown) {
      const error =
        thrown instanceof ConversionError ? thrown : new ConversionError('E009', String(thrown));
      lastError = error;

      // Escalation is permitted once; the first server attempt is the last.
      const isClientAttempt = engine.startsWith('CLIENT_');
      if (isClientAttempt && shouldEscalate(plan, error, fileSizeBytes) && attempted === 1) {
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ConversionError('E009', 'No engine in the plan could be attempted.');
}

/** Convenience predicate for callers that only need a yes or no. */
export function canConvert(source: string, target: string): boolean {
  return isConvertible(source, target);
}

// ===========================================================================
// The `EngineName` router.
//
// Everything above this line is the original `EngineKind` API: it names adapter
// objects and carries the client-then-escalate flow. Everything below is the
// server-side API in the short engine vocabulary, and it is what the HTTP routes
// use. Both are exported because both have callers, and the older one is also
// the client bridge's contract.
//
// Keeping two planners in one file is deliberate rather than tidy: they answer
// the same question with different vocabularies, and having them side by side
// makes it obvious when they disagree.
// ===========================================================================

/**
 * The ordered plan for one file, in the short engine vocabulary.
 *
 * Distinct from the `ConversionPlan` above: that one is a client-first chain
 * ending in an escalation flag, this one is a server chain of concrete engines
 * to attempt. Both are called "plan" and neither extends the other, because
 * merging them would give every field an awkward `clientX`/`serverX` prefix.
 */
export interface ExecutionPlan {
  readonly sourceFormat: string;
  readonly targetFormat: string;
  /** First engine to try. */
  readonly primary: EngineName;
  /** Engines to try after the primary fails, in order. */
  readonly fallbacks: readonly EngineName[];
  /** `primary` followed by `fallbacks`. Never empty for a valid pair. */
  readonly engines: readonly EngineName[];
  /** True when a browser could do this pair without a server round trip. */
  readonly clientSide: boolean;
  /** True when any engine in the chain is a native binary. */
  readonly requiresNative: boolean;
  /** Per-file deadline for this pair, in milliseconds. */
  readonly timeoutMs: number;
  /** Human-readable justification, surfaced by `GET /api/formats/[format]`. */
  readonly reason: string;
  /** True when the pair is export-only and has no reverse. */
  readonly oneWay: boolean;
}

/** Options for {@link planExecutionChain}. */
export interface PlanOptions {
  /**
   * Ask for the client-side answer even when a server engine could do it.
   * Ignored for pairs no browser can handle, which is the point: a preference
   * is not a capability.
   */
  readonly preferClient?: boolean;
  /** Probe results, used to drop engines this host cannot run. */
  readonly availability?: Partial<Record<EngineName, boolean>>;
  /** Longest output edge in pixels. RAW changes how the source is developed. */
  readonly maxDimension?: number;
  /** Override the per-file deadline. */
  readonly timeoutMs?: number;
}

/** Availability keyed by the short engine name. */
export type EngineNameAvailability = Partial<Record<EngineName, boolean>>;

/**
 * Build the server execution chain for a pair.
 *
 * The chain comes from `getFallbackEngines`, which is derived from the matrix
 * and the real engine capabilities, so this function adds policy rather than
 * knowledge: a timeout budget, a client-side verdict, and a stated reason.
 *
 * @throws ConversionError `E001` when the pair is not in the matrix.
 */
export function planExecutionChain(
  sourceFormat: string,
  targetFormat: string,
  options: PlanOptions = {}
): ExecutionPlan {
  const source = sourceFormat.toLowerCase();
  const target = targetFormat.toLowerCase();

  if (!isConversionSupported(source, target)) {
    // Named explicitly rather than left to the matrix lookup, so the message
    // tells the user which of the two formats is the problem.
    throw new ConversionError('E001', `${source} cannot be converted to ${target}`, {
      format: source,
    });
  }

  const chain = getFallbackEngines(source, target);
  const primary = chain[0];
  if (primary === undefined) {
    throw new ConversionError('E001', `no engine for ${source} to ${target}`, { format: source });
  }

  // A browser can only ever do the pairs `canBrowserConvert` allows, whatever
  // `preferClient` says.
  const browserCapable = canBrowserConvert(source, target);
  const clientSide = browserCapable && options.preferClient === true;

  // Engines the host reports as unavailable are dropped up front, so the plan
  // says what will actually be attempted. A pair left with no engine at all is
  // still planned: `executeWithFallback` raises E006 with the missing binary
  // named, which is a better message than an empty plan.
  const availability = options.availability ?? {};
  const runnable = chain.filter((engine) => availability[engine] !== false);
  const effective = runnable.length > 0 ? runnable : chain;

  // RAW development is legitimately slow, so it gets its own longer budget.
  // Anything else uses the standard deadline.
  const isRaw = RAW_FORMATS.includes(source);
  const timeoutMs = options.timeoutMs ?? (isRaw ? ENGINE_TIMEOUT_RAW_MS : ENGINE_TIMEOUT_MS);

  return {
    sourceFormat: source,
    targetFormat: target,
    primary: effective[0] as EngineName,
    fallbacks: effective.slice(1),
    engines: effective,
    clientSide,
    requiresNative: effective.some((engine) => engine !== 'client'),
    timeoutMs,
    reason: describeChain(source, target, effective, isRaw),
    oneWay: isOneWay(source),
  };
}

/** State the reason in one sentence, for the UI and the API. */
function describeChain(
  source: string,
  target: string,
  chain: readonly EngineName[],
  isRaw: boolean
): string {
  const fallback = chain.length > 1 ? `, with ${chain[1]} as a fallback` : '';

  if (isRaw) {
    return `${source} is camera RAW, so LibRaw develops it and the result is encoded${fallback}.`;
  }
  if (chain[0] === 'ghostscript') {
    return `${source} is PostScript, so Ghostscript renders it and sharp encodes the raster${fallback}.`;
  }
  if (chain[0] === 'imagemagick') {
    return `${source} or ${target} needs a delegate only ImageMagick has${fallback}.`;
  }
  return `${source} to ${target} is handled entirely in-process by sharp${fallback}.`;
}

/** True when the source row is marked export-only. */
function isOneWay(source: string): boolean {
  return Object.prototype.hasOwnProperty.call(ONE_WAY_FORMATS, source);
}

/** Every engine adapter, keyed by the short name. */
type EngineRunner = (
  input: Buffer,
  target: string,
  options: EngineConversionOptions
) => Promise<Buffer>;

/**
 * The dispatch table.
 *
 * `client` is present only so the type is total. A server route that reaches it
 * has made a planning error, and saying so is more useful than silently
 * returning nothing.
 */
const RUNNERS: Readonly<Record<EngineName, EngineRunner>> = {
  sharp: convertWithSharpBuffer,
  imagemagick: convertWithImageMagick,
  libraw: convertWithLibRaw,
  ghostscript: convertWithGhostscript,
  client: () => {
    throw new ConversionError('E006', 'client-side conversion must run in the browser', {}, {});
  },
};

/**
 * Run a plan, falling back through the chain.
 *
 * Two classes of failure advance to the next engine, and they are different
 * reasons:
 *
 *  - `E006`, the binary is not installed. That is a fact about the machine, not
 *    about the file, so the next engine is a genuinely different attempt. A
 *    missing ImageMagick must not fail a request sharp could have done.
 *  - anything `retryable`, which is a timeout, an engine-level failure, or
 *    `E004`. TRD 11 allows one retry here.
 *
 * Everything else is rethrown immediately, so a non-retryable code such as
 * `E010` (a spoofed file) or `E002` (over the size ceiling) ends the chain at
 * once.
 *
 * `E004` deliberately rides the `retryable` flag rather than being special-cased
 * below: an E004 out of sharp on a HEIC source usually means this libvips build
 * has no libheif decoder, and ImageMagick — which links libheif — is already
 * queued behind sharp for heic -> jpg/png. The guard below therefore has no
 * hard-coded `E004` exclusion, and adding one would silently break that
 * fallback; change `retryable` in lib/constants/errors.ts instead.
 *
 * @param plan From {@link planExecutionChain}.
 * @param input Raw source bytes, already format-verified by the route.
 * @param options Per-file overrides. `sourceFormat` and `timeoutMs` are filled
 *   in from the plan when the caller did not specify them.
 * @returns The converted bytes. The caller owns the buffer.
 */
export async function executeWithFallback(
  plan: ExecutionPlan,
  input: Buffer,
  options: EngineConversionOptions = {}
): Promise<Buffer> {
  if (input.length === 0) {
    throw new ConversionError('E004', 'empty file', { format: plan.sourceFormat });
  }
  if (input.length > SERVER_MAX_FILE_SIZE_BYTES) {
    throw new ConversionError('E002', 'file exceeds the server size limit', {
      format: plan.sourceFormat,
    });
  }

  const settings: EngineConversionOptions = {
    ...options,
    sourceFormat: options.sourceFormat ?? plan.sourceFormat,
    timeoutMs: options.timeoutMs ?? plan.timeoutMs,
  };

  const attempted: string[] = [];
  let lastError: ConversionError | null = null;

  for (const engine of plan.engines) {
    if (engine === 'client') {
      // The browser is not a server engine. A plan containing it is either a
      // client-side plan, which the route should have answered without calling
      // this, or a bug.
      attempted.push('client:skipped');
      continue;
    }

    try {
      return await RUNNERS[engine](input, plan.targetFormat, settings);
    } catch (error) {
      const failure = toConversionError(error, { format: plan.targetFormat });
      lastError = failure;
      attempted.push(`${engine}:${failure.code}`);

      // A spoofed file is a contract violation, never a reason to try harder.
      if (failure.code === 'E010') throw failure;

      const engineMissing = failure.code === 'E006';
      // One flag drives this, so `retryable` in lib/constants/errors.ts is the
      // single place that decides whether a code walks the chain. E004 in
      // particular must not be re-thrown here: that is what stopped a valid
      // HEIC from reaching the ImageMagick fallback.
      if (!engineMissing && !failure.retryable) throw failure;
    }
  }

  // Every engine was missing or failed retryably. Prefer the most recent real
  // failure; fall back to E006 only when nothing was actually attempted.
  throw (
    lastError ??
    new ConversionError(
      'E006',
      `no engine available for ${plan.sourceFormat} to ${plan.targetFormat}`,
      {},
      { cause: new Error(`tried: ${attempted.join(', ') || 'none'}`) }
    )
  );
}

/** A request that has passed shape and pair validation. */
export interface ValidatedConversionRequest {
  readonly sourceFormat: string;
  readonly targetFormat: string;
  readonly clientSide: boolean;
  readonly quality: number | undefined;
  readonly preserveMetadata: boolean;
  readonly preserveAnimation: boolean;
  readonly maxDimension: number | undefined;
}

/** What a caller may submit to `validateRequest`. */
export interface IncomingConversionRequest {
  readonly sourceFormat?: unknown;
  readonly targetFormat?: unknown;
  readonly clientSide?: unknown;
  readonly quality?: unknown;
  readonly preserveMetadata?: unknown;
  readonly preserveAnimation?: unknown;
  readonly maxDimension?: unknown;
}

/**
 * Validate and normalise a conversion request.
 *
 * This is the semantic half of request validation, and it is deliberately
 * separate from the zod schema in `lib/validation/convert.ts`. The schema
 * answers "is this the right *shape*"; this answers "does this request make
 * sense" — is the pair in the matrix, are the numbers in range, is
 * `clientSide` claiming something no browser can do. Splitting them means a
 * malformed form field and an impossible conversion produce different messages.
 *
 * Unknown properties are dropped rather than rejected: a client sending an extra
 * field is not an attack, and failing the whole request for it would be hostile.
 *
 * @throws ConversionError `E001` for a bad or unsupported pair.
 */
export function validateRequest(request: IncomingConversionRequest): ValidatedConversionRequest {
  const sourceFormat =
    typeof request.sourceFormat === 'string' ? request.sourceFormat.toLowerCase() : '';
  const targetFormat =
    typeof request.targetFormat === 'string' ? request.targetFormat.toLowerCase() : '';

  if (sourceFormat.length === 0 || targetFormat.length === 0) {
    throw new ConversionError(
      'E001',
      `sourceFormat=${sourceFormat || '(missing)'} targetFormat=${targetFormat || '(missing)'}`,
      {},
      { message: 'Both a source format and a target format are required.' }
    );
  }

  if (!isConversionSupported(sourceFormat, targetFormat)) {
    // One code, several distinct user situations, so each gets its own copy.
    // `detail` keeps the diagnostic; `message` is what the user reads.
    throw new ConversionError(
      'E001',
      `${sourceFormat} -> ${targetFormat} is not in CONVERSION_MATRIX`,
      { format: sourceFormat },
      {
        message: `${sourceFormat.toUpperCase()} cannot be converted to ${targetFormat.toUpperCase()}.`,
      }
    );
  }

  const requestedClientSide = request.clientSide === true || request.clientSide === 'true';
  if (requestedClientSide && !canBrowserConvert(sourceFormat, targetFormat)) {
    // Silently doing it server-side would be worse than refusing: the caller
    // asked for a guarantee (no upload) that cannot be kept.
    throw new ConversionError(
      'E001',
      `clientSide requested for ${sourceFormat} -> ${targetFormat}, which canBrowserConvert rejects`,
      { format: sourceFormat },
      {
        message: `${sourceFormat.toUpperCase()} to ${targetFormat.toUpperCase()} needs the server engine and cannot run in your browser.`,
      }
    );
  }

  return {
    sourceFormat,
    targetFormat,
    clientSide: requestedClientSide,
    quality: optionalInteger(request.quality, 1, 100, 'quality'),
    preserveMetadata: request.preserveMetadata === true || request.preserveMetadata === 'true',
    preserveAnimation: request.preserveAnimation === true || request.preserveAnimation === 'true',
    maxDimension: optionalInteger(request.maxDimension, 1, 50_000, 'maxDimension'),
  };
}

/** Parse an optional integer field, rejecting anything out of range. */
function optionalInteger(
  value: unknown,
  min: number,
  max: number,
  field: string
): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new ConversionError(
      'E001',
      `${field}=${String(value)} is not an integer`,
      {},
      { message: `${field} must be a whole number.` }
    );
  }
  if (parsed < min || parsed > max) {
    throw new ConversionError(
      'E001',
      `${field}=${parsed} is outside [${min}, ${max}]`,
      {},
      { message: `${field} must be between ${min} and ${max}.` }
    );
  }
  return parsed;
}
