/**
 * lib/constants/errors.ts
 * Error code table E001-E009 with the HTTP status, retry semantics and the
 * user-facing message. Messages contain no file paths, no stack frames and no
 * binary names, and no `{token}` placeholders: a token that no call site
 * substitutes is shipped to the client verbatim as a literal, so the table
 * carries none. Call sites with something specific to say pass a `message`
 * override to the `ConversionError` constructor instead.
 *
 * Source: Documents/TRD.md section 11.
 */

/**
 * Stable error codes, E001-E010.
 *
 * The union itself is declared in `types/error.ts` so the type layer can name a
 * code without importing `lib/` (FOLDER-ARCHITECTURE.md 6.1). It is re-exported
 * here so that `import type { ErrorCode } from '@/lib/constants/errors'` — the
 * form every existing call site uses — keeps resolving.
 */
export type { ErrorCode } from '@/types/error';

import type { ErrorCode } from '@/types/error';

/** One row of the error table. */
export interface ErrorDefinition {
  readonly code: ErrorCode;
  readonly name: string;
  readonly meaning: string;
  /** HTTP status for this code. Named `http` to match the documented table. */
  readonly http: number;
  /** Whether the router may retry or escalate for this code. */
  readonly retryable: boolean;
  /** Whether the router may escalate this failure from client to server. */
  readonly escalatable: boolean;
  /**
   * User-facing copy, deliberately placeholder-free.
   *
   * `messageFor` leaves an unmatched `{token}` in the string, so any token a
   * call site forgets to pass is a literal the user reads. Keeping the table
   * token-free makes that failure impossible rather than merely unlikely.
   */
  readonly message: string;
  /** Developer-facing remediation, shown in the console log only. */
  readonly hint: string;
}

export const ERRORS: Readonly<Record<ErrorCode, ErrorDefinition>> = {
  E001: {
    code: 'E001',
    name: 'Unsupported format pair',
    meaning:
      'The (source, target) pair is absent from the matrix, or the target is a source-only family.',
    http: 400,
    retryable: false,
    escalatable: false,
    message: "That conversion isn't supported.",
    hint: 'Check the pair against CONVERSION_MATRIX in lib/constants/formats.ts.',
  },
  E002: {
    code: 'E002',
    name: 'File too large',
    meaning: 'File exceeds the 100 MB client or 50 MB server ceiling, or the batch exceeds 500 MB.',
    http: 413,
    retryable: false,
    escalatable: false,
    message: 'This file is too large to convert.',
    hint: 'Client ceiling is MAX_FILE_SIZE_MB; server ceiling is SERVER_MAX_FILE_SIZE_MB.',
  },
  E003: {
    code: 'E003',
    name: 'Too many files',
    meaning: `Batch would exceed MAX_FILES (${20}).`,
    http: 400,
    retryable: false,
    escalatable: false,
    message: 'Maximum 20 files per batch.',
    hint: 'The 21st file is rejected client-side before any upload is attempted.',
  },
  E004: {
    code: 'E004',
    name: 'Corrupt file',
    meaning: 'Magic-byte mismatch, truncated payload, or engine decode failure.',
    http: 500,
    // Deliberately retryable, changed from false. For a HEIC/HEIF source an E004
    // out of sharp most often means "this libvips build has no libheif decoder",
    // not "your file is broken" — and `getFallbackEngines` already queues
    // ImageMagick, which links libheif, behind sharp for heic -> jpg/png. With
    // the old `false`, `executeWithFallback` rethrew on the first engine and a
    // perfectly valid HEIC was reported as a damaged file even though the
    // fallback one slot over would have decoded it. One wasted process spawn on
    // a genuinely corrupt file is cheaper than a false corruption report.
    retryable: true,
    escalatable: true,
    // No `{format}` token. The catch-all branch of `decodeFailure` in
    // lib/convert/engines/sharp.ts throws E004 with an empty `vars` object, so a
    // token here reached the JSON body and the console as a literal
    // "{format}". Wording matches the client-side E004 in
    // lib/constants/messages.ts.
    message: 'This file appears to be damaged or is not a valid image.',
    hint: 'Compare the magic bytes in lib/utils/magic-bytes.ts against the file header.',
  },
  E005: {
    code: 'E005',
    name: 'Client-side conversion failed',
    meaning: 'Canvas, WASM or heic2any threw for a non-specific reason.',
    http: 500,
    retryable: true,
    escalatable: true,
    message: "Couldn't convert this file in your browser. Retrying on the server.",
    hint: 'Escalation happens at most once per file; a server failure after escalation is final.',
  },
  E006: {
    code: 'E006',
    name: 'Server-side engine missing',
    meaning: 'A required binary is absent from PATH or from the configured env path.',
    http: 500,
    retryable: false,
    escalatable: false,
    // No `{engine}` token. The engine modules (lib/convert/engines/
    // ghostscript.ts, libraw.ts, imagemagick.ts) and sharp's own loader all
    // construct E006 with an empty `vars` object, so the table copy reached
    // users as a literal "{engine} isn't installed" — the same leak E004 had.
    // The binary name still reaches the console through `detail`, and a call
    // site that wants it in the message passes a `message` override.
    message: "A required conversion engine isn't installed. Run `pnpm check-engines`.",
    hint: 'See Documents/TRD.md section 14.1 for per-OS install commands.',
  },
  E007: {
    code: 'E007',
    name: 'Server-side conversion timeout',
    meaning: 'The engine exceeded ENGINE_TIMEOUT_MS and was killed.',
    http: 500,
    retryable: true,
    escalatable: true,
    message: 'This file took too long to convert and was stopped.',
    hint: 'RAW development timeouts are often a dcraw_emu -h flag issue rather than a real hang.',
  },
  E008: {
    code: 'E008',
    name: 'Out of memory',
    meaning: 'Browser heap exhausted, or Node aborted the allocation.',
    http: 500,
    retryable: false,
    escalatable: true,
    message: 'Ran out of memory. Try fewer or smaller files.',
    hint: 'Concurrency is capped at MAX_CONCURRENCY and object URLs are revoked on removal.',
  },
  E009: {
    code: 'E009',
    name: 'Unknown error',
    meaning: 'Unclassified throw.',
    http: 500,
    retryable: true,
    escalatable: true,
    message: 'Something went wrong. Please try again.',
    hint: 'Unwrap the cause before classifying; anything unrecognised is E009.',
  },
  E010: {
    code: 'E010',
    name: 'Format mismatch (spoofed file)',
    meaning:
      "The bytes of the upload do not match the declared source format. The extension or the client's MIME type was a lie.",
    http: 400,
    // Deliberately not retryable and not escalatable: the same bytes will fail
    // again on the server, so there is nothing to gain by escalating. E004 is
    // the code for a genuinely unreadable file; E010 is for a readable file of
    // the *wrong* format, which is a contract violation rather than corruption.
    retryable: false,
    escalatable: false,
    // No `{format}` token. The one call site that raises E010 (app/api/convert/
    // route.ts) does pass `format`, but a token that only works for the call
    // sites that remembered it is the exact hazard this table no longer has. The
    // route keeps the format-specific wording for the user through its own
    // `message` override, and the client-side E010 in lib/constants/messages.ts
    // keeps the interpolated copy for the UI.
    message: "This file isn't the format it was uploaded as.",
    hint: 'POST /api/convert re-detects the format from magic bytes and compares it to sourceFormat. See lib/utils/magic-bytes.ts.',
  },
} as const;

/** Every error code, in table order. */
export const ERROR_CODES: readonly ErrorCode[] = [
  'E001',
  'E002',
  'E003',
  'E004',
  'E005',
  'E006',
  'E007',
  'E008',
  'E009',
  'E010',
];

/**
 * Codes that may escalate from the client engine to the server engine.
 *
 * Kept as a set rather than read off `escalatable` so the router's decision is
 * one lookup and the policy is stated in exactly one place.
 */
export const ESCALATABLE_CODES: ReadonlySet<ErrorCode> = new Set(
  ERROR_CODES.filter((code) => ERRORS[code].escalatable)
);

/** Codes on which the router may try the next engine in the fallback chain. */
export const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set(
  ERROR_CODES.filter((code) => ERRORS[code].retryable)
);

/** Default message for a code, used when a throw site has nothing better. */
export function messageFor(code: ErrorCode, vars: Record<string, string> = {}): string {
  return ERRORS[code].message.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

/**
 * Error thrown by every engine and route handler.
 *
 * `message` is safe to show. `detail` carries the stack, spawn argv or engine
 * stderr and must only ever reach the console, never an API body or a toast.
 */
export class ConversionError extends Error {
  readonly code: ErrorCode;
  readonly detail: string;
  readonly retryable: boolean;
  readonly escalatable: boolean;
  readonly httpStatus: number;

  constructor(
    code: ErrorCode,
    detail = '',
    vars: Record<string, string> = {},
    options?: { cause?: unknown; message?: string }
  ) {
    // A caller-supplied `message` replaces the table copy. It must already be
    // user-safe; `detail` remains the private channel for anything that is not.
    super(options?.message ?? messageFor(code, vars));
    this.name = 'ConversionError';
    this.code = code;
    this.detail = detail;
    this.retryable = ERRORS[code].retryable;
    this.escalatable = ERRORS[code].escalatable;
    this.httpStatus = ERRORS[code].http;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/** Classify an unknown throw, preserving a ConversionError untouched. */
export function toConversionError(
  error: unknown,
  vars: Record<string, string> = {}
): ConversionError {
  if (error instanceof ConversionError) return error;
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  return new ConversionError('E009', detail, vars, { cause: error });
}

/** Write a developer log line. There is no telemetry; this is the only signal. */
export function logConversionError(
  error: ConversionError,
  context: Record<string, unknown> = {}
): void {
  console.error('[camerlob]', error.code, ERRORS[error.code].name, context, error.detail);
}

/**
 * Engine labels, used to turn an engine key into prose.
 *
 * Fed into `vars.engine` by `makeConversionError` and then into a caller-supplied
 * `message` override, which is where a named binary still reaches the user. The
 * ERRORS table no longer interpolates them, because several engine call sites
 * construct E006 with no vars at all.
 */
export const ENGINE_LABELS: Readonly<Record<string, string>> = {
  sharp: 'sharp',
  imagemagick: 'ImageMagick',
  libraw: 'LibRaw',
  ghostscript: 'Ghostscript',
  client: 'the browser engine',
  magick: 'ImageMagick',
  dcraw_emu: 'LibRaw',
  gs: 'Ghostscript',
};

/**
 * Build a `ConversionError` without the caller having to remember the argument
 * order of the constructor.
 *
 * The class constructor is positional (`code, detail, vars`) because it is
 * constructed in hot paths inside engines. This factory takes a named options
 * object instead, which is what every call site outside `lib/convert/engines/`
 * should use — swapping `detail` and `vars` silently is the easiest mistake to
 * make with a positional signature.
 *
 * @param code Stable error code, E001-E010.
 * @param engine Optional engine name, interpolated into the message and kept on
 *   the error so the fallback log can attribute the failure.
 * @param detail Private diagnostic: stack, argv or engine stderr. Never
 *   serialised into an API response.
 * @param vars Extra message interpolations, e.g. `{ format: 'PSD' }`.
 * @param cause Original throw, preserved for `instanceof` chains.
 * @param message Optional user-facing override. Use it when one code covers
 *   genuinely different user situations and the generic copy would be actively
 *   unhelpful — "sourceFormat and targetFormat are both required" versus the
 *   generic "That conversion is not supported" for the same E001. Only pass text
 *   that is safe to show: no paths, no argv, no stack.
 */
export function makeConversionError(
  code: ErrorCode,
  engine?: string | null,
  detail = '',
  vars: Record<string, string> = {},
  cause?: unknown,
  message?: string
): ConversionError {
  const engineLabel = engine ? (ENGINE_LABELS[engine] ?? engine) : undefined;
  return new ConversionError(
    code,
    detail,
    { ...vars, ...(engineLabel ? { engine: engineLabel } : {}) },
    {
      ...(cause === undefined ? {} : { cause }),
      ...(message === undefined ? {} : { message }),
    }
  );
}

/** The wire shape of an error. Deliberately excludes `detail`. */
export interface SerialisedConversionError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly retryable: boolean;
}

/**
 * Reduce a `ConversionError` to the body a client is allowed to see.
 *
 * `detail` is dropped on the floor here, which is the single place that fact is
 * enforced. Route handlers call this rather than hand-building the object, so
 * a stack trace cannot reach the network by accident.
 */
export function serialiseConversionError(error: ConversionError): SerialisedConversionError {
  return {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
  };
}

/**
 * HTTP status for a code.
 *
 * E001 is deliberately two-valued: a missing or unparseable `sourceFormat` is a
 * malformed request (400) while a well-formed but unsupported pair is a media
 * type the server will not produce (415). `httpStatus` carries the 415 default
 * and the handler passes `400` explicitly for the malformed case, which is why
 * `statusForError` accepts an override.
 */
export function statusForError(error: ConversionError, override?: number): number {
  return override ?? error.httpStatus;
}
