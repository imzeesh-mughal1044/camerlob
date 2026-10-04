/**
 * lib/convert/engines/sharp.ts
 * sharp adapter: the fast path for everything sharp can both read and write.
 *
 * sharp is loaded with a dynamic import so that environments which never touch
 * the server engine (a pure client-side conversion, a static export) do not pay
 * for the native binding.
 *
 * TWO APIs, ON PURPOSE
 * ------------------------------------------------------------------------
 * `convertWithSharpBuffer` is the server implementation: bytes in, bytes out,
 * no temp file, no `File` object. `convertWithSharp` predates it and takes a
 * `File` because the original client bridge used to hand browser objects
 * straight to the engine registry. That registry is still wired up in
 * `server-converter.ts`, so both survive — but new code should use the Buffer
 * form, because converting `File -> ArrayBuffer -> Buffer` for every request
 * copies the whole payload for no reason.
 *
 * WHAT SHARP CAN ACTUALLY DO
 * ------------------------------------------------------------------------
 * The capability lists in `lib/convert/formats.ts` were derived from the
 * installed binary rather than from the docs, and the two disagree. This build
 * can read jpeg, png, webp, tiff, gif and heif, and write all of those — with
 * AVIF and HEIC both going through the `heif` encoder. It cannot read or write
 * BMP, ICO, TGA or PPM, which is why those rows are routed to ImageMagick
 * instead. Asking sharp for `.bmp()` throws "not a function"; asking it to
 * decode a BMP throws "unsupported image format".
 */

import { ConversionError } from '@/lib/constants/errors';
import { DEFAULT_MAX_DIMENSION, DEFAULT_QUALITY, MAX_INPUT_PIXELS } from '@/lib/constants/limits';
import { getFormatMeta } from '@/lib/constants/formats';
import type { ConversionOptions, EngineAdapter, EngineKind } from '@/types/engine';
import type { EngineConversionOptions } from '@/types/conversion';

/**
 * Matrix target id -> the sharp encoder that produces it.
 *
 * `bmp` is deliberately absent. An earlier revision mapped it to `png`, which
 * produced a PNG payload served under a `.bmp` name: a file that looked
 * converted but was not, and that no other tool would open. An honest
 * "unsupported" beats a mislabelled payload, and the router now sends BMP to
 * ImageMagick.
 */
const SHARP_OUTPUTS: Readonly<Record<string, 'jpeg' | 'png' | 'webp' | 'heif' | 'gif' | 'tiff'>> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jfif: 'jpeg',
  png: 'png',
  webp: 'webp',
  // AVIF and HEIC share libvips' HEIF encoder; only the codec differs.
  avif: 'heif',
  // No `heic`/`heif` writer: this libvips build has no HEVC encoder, so
  // `.heif({ compression: 'hevc' })` fails. HEIC targets go to ImageMagick.
  // The formats stay in `canDecode` — reading HEIC works fine.
  gif: 'gif',
  tiff: 'tiff',
  tif: 'tiff',
};

/** Per-target encoder settings. */
interface EncoderSettings {
  readonly quality: number;
  /** heif only: the codec to mux into the container. */
  readonly heifCompression?: 'av1' | 'hevc';
  /** Effort 1-10. Higher is slower and smaller. */
  readonly effort?: number;
}

const AVIF_QUALITY = 80;
const WEBP_EFFORT = 4;
const AVIF_EFFORT = 4;
const PNG_COMPRESSION_LEVEL = 9;

/** The subset of the sharp API this adapter uses, declared locally. */
interface SharpInstance {
  metadata(): Promise<{ width?: number; height?: number; format?: string; pages?: number }>;
  /** No argument means "auto-orient from the EXIF orientation tag". */
  rotate(): SharpInstance;
  resize(options: {
    width?: number;
    height?: number;
    fit: 'inside';
    withoutEnlargement: boolean;
  }): SharpInstance;
  jpeg(options: { quality: number; progressive?: boolean }): SharpInstance;
  png(options?: { compressionLevel?: number; effort?: number }): SharpInstance;
  webp(options: { quality: number; effort?: number }): SharpInstance;
  heif(options: { compression: 'av1' | 'hevc'; quality: number; effort?: number }): SharpInstance;
  gif(options?: { effort?: number }): SharpInstance;
  tiff(options?: { compression: 'lzw' }): SharpInstance;
  withMetadata(): SharpInstance;
  toBuffer(): Promise<Buffer>;
  toFormat(format: string, options?: Record<string, number>): SharpInstance;
}

/** Constructor options, kept separate so the call sites read clearly. */
interface SharpInputOptions {
  limitInputPixels?: number;
  /** Decode every frame rather than the first. */
  animated?: boolean;
  /** Tolerate a truncated or slightly malformed final frame. */
  failOn?: 'none' | 'truncated' | 'error' | 'warning';
}

type SharpFactory = ((input: Buffer, options?: SharpInputOptions) => SharpInstance) & {
  versions?: { sharp?: string; vips?: string };
  /**
   * Runtime capability report. `format.heif.input` is `false` on a libvips built
   * without libheif, and a boolean-ish capability object on one built with it.
   * Read from the loaded module rather than assumed, because the answer is a
   * property of the *installed binary*, not of the sharp version.
   */
  format?: { heif?: { input?: boolean } };
};

/**
 * Lazily import and cache the sharp module.
 *
 * sharp is CommonJS, so under `esModuleInterop` the factory arrives on
 * `.default` while the namespace object is itself callable. Both spellings are
 * accepted so the adapter survives either interop setting.
 */
let sharpModule: Promise<SharpFactory> | null = null;

async function loadSharp(): Promise<SharpFactory> {
  if (!sharpModule) {
    sharpModule = import('sharp').then((module) => {
      const candidate = (module as { default?: unknown }).default ?? module;
      if (typeof candidate !== 'function') {
        throw new ConversionError('E006', 'sharp did not export a constructor', {}, {});
      }
      return candidate as SharpFactory;
    });
  }
  const pending = sharpModule;
  // Unreachable in practice: the branch above always assigns before this line.
  return pending ?? Promise.reject(new ConversionError('E006', 'sharp failed to load', {}, {}));
}

/** Encoder settings for a target, honouring a caller-supplied quality. */
function settingsFor(target: string, options: EngineConversionOptions): EncoderSettings {
  const quality = options.quality ?? DEFAULT_QUALITY;
  switch (target) {
    case 'avif':
      return {
        quality: options.quality ?? AVIF_QUALITY,
        heifCompression: 'av1',
        effort: AVIF_EFFORT,
      };
    case 'webp':
      return { quality, effort: WEBP_EFFORT };
    case 'png':
      return { quality: 100 };
    case 'gif':
      return { quality };
    default:
      return { quality };
  }
}

/** Apply the encoder for `target` to a pipeline. */
function applyEncoder(
  pipeline: SharpInstance,
  target: string,
  options: EngineConversionOptions
): SharpInstance {
  const settings = settingsFor(target, options);
  switch (SHARP_OUTPUTS[target]) {
    case 'jpeg':
      // Progressive JPEG renders top-down over a slow link and is the same size.
      return pipeline.jpeg({ quality: settings.quality, progressive: true });
    case 'png':
      return pipeline.png({ compressionLevel: PNG_COMPRESSION_LEVEL, effort: 7 });
    case 'webp':
      return pipeline.webp({ quality: settings.quality, effort: settings.effort ?? WEBP_EFFORT });
    case 'heif':
      return pipeline.heif({
        compression: settings.heifCompression ?? 'av1',
        quality: settings.quality,
        effort: settings.effort ?? AVIF_EFFORT,
      });
    case 'gif':
      return pipeline.gif({ effort: 7 });
    case 'tiff':
      return pipeline.tiff({ compression: 'lzw' });
    default:
      return pipeline.toFormat(String(target));
  }
}

/** True when the source can plausibly carry more than one frame. */
function targetCanAnimate(target: string): boolean {
  return target === 'gif' || target === 'webp';
}

/**
 * Convert bytes with sharp. The server conversion path.
 *
 * @param input Raw source bytes. Never assumed to match the declared format —
 *   the route re-detects from magic bytes before calling this.
 * @param target Matrix target id, e.g. `jpg`.
 * @param options Quality, metadata and animation policy.
 * @returns The encoded bytes. The caller owns the buffer.
 * @throws ConversionError `E007` when sharp has no encoder for `target`, `E004`
 *   when the bytes cannot be decoded or the pixel budget is exceeded.
 */
export async function convertWithSharpBuffer(
  input: Buffer,
  target: string,
  options: EngineConversionOptions = {}
): Promise<Buffer> {
  const id = target.toLowerCase();

  if (!SHARP_OUTPUTS[id]) {
    // E001, not E007: per TRD 11 this is an unsupported *pair*, and E007 is
    // reserved for the 60s timeout. The router should never have routed here.
    throw new ConversionError('E001', `sharp has no encoder for ${target}`, { format: target });
  }
  if (input.length === 0) {
    throw new ConversionError('E004', 'sharp received an empty buffer', { format: target });
  }

  const toSharp = await loadSharp();
  const animated = options.preserveAnimation === true && targetCanAnimate(id);

  // Read geometry on a throwaway pipeline. Probing must not mutate the pipeline
  // that does the work, and a failure here is not fatal: sharp will report a
  // genuinely broken file during the real decode.
  const longest = await longestEdge(input).catch(() => 0);
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;

  let pipeline = toSharp(input, {
    limitInputPixels: MAX_INPUT_PIXELS,
    animated,
    // A conversion service should not reject a file over a bad final frame; the
    // still image the user asked for is usually recoverable.
    failOn: 'none',
  });

  // Honour the EXIF orientation tag. Without this a phone photo arrives rotated,
  // which is the single most common complaint about image converters.
  pipeline = pipeline.rotate();

  // Downscale before encoding, never up: enlarging spends bytes to add no detail.
  if (longest > maxDimension) {
    pipeline = pipeline.resize({
      fit: 'inside',
      withoutEnlargement: true,
      width: maxDimension,
      height: maxDimension,
    });
  }

  // sharp strips metadata unless told otherwise, which is the safe default:
  // EXIF carries GPS coordinates.
  if (options.preserveMetadata === true) pipeline = pipeline.withMetadata();

  pipeline = applyEncoder(pipeline, id, options);

  try {
    return await pipeline.toBuffer();
  } catch (cause) {
    // A HEIF/HEIC this binary cannot open is a missing capability, not a corrupt
    // file. E004 says "your file is damaged" and sends the user to go and check
    // a perfectly good photo, so the capability is consulted first and the
    // missing decoder is reported as E006 — the code the app already uses for
    // "this machine cannot do this". See `heifDecodeSupported` for why the
    // answer is per-installation and not per-version.
    if (looksLikeHeif(input) && !(await heifDecodeSupported())) {
      throw new ConversionError(
        'E006',
        'this sharp build has no HEIF/HEIC decoder (format.heif.input is false)',
        { engine: 'the sharp HEIC decoder' },
        { cause }
      );
    }
    throw decodeFailure(cause, id);
  }
}

/** Turn a sharp throw into the right code. */
function decodeFailure(cause: unknown, target: string): ConversionError {
  const message = cause instanceof Error ? cause.message : String(cause);
  const detail = cause instanceof Error ? (cause.stack ?? message) : message;

  // sharp phrases its pixel budget as a limit, not a corruption. Charging that
  // to E004 ("couldn't read it") sends the user looking for a broken file when
  // the file is fine and simply enormous.
  if (/limitInputPixels|exceeds pixel limit/i.test(message)) {
    return new ConversionError(
      'E004',
      `image exceeds the ${MAX_INPUT_PIXELS}-pixel limit`,
      {},
      { cause }
    );
  }
  if (/unsupported image format/i.test(message)) {
    return new ConversionError(
      'E004',
      'sharp cannot decode these bytes',
      { format: target },
      { cause }
    );
  }
  // The catch-all: sharp threw and the message says neither "unsupported image
  // format" nor a pixel-limit breach, so there is nothing more specific to say.
  // `vars` is empty and must stay empty-safe — the table copy for E004 no longer
  // carries a `{format}` token precisely so this throw is a complete message with
  // no substitution needed. Passing no vars here was previously the reason a raw
  // "{format}" reached the API body and the console.
  return new ConversionError('E004', detail, {}, { cause });
}

/**
 * True when the bytes announce an ISO-BMFF HEIF-family container.
 *
 * Decided from the `ftyp` box rather than from the extension: the question is
 * what the file *is*, and a HEIC renamed to `.jpg` still answers here. AVIF is
 * included deliberately — it shares the same `ftyp` layout, so excluding it
 * would leave a real gap between the check and the container it inspects.
 */
function looksLikeHeif(input: Buffer): boolean {
  if (input.length < 12 || input.toString('latin1', 4, 8) !== 'ftyp') return false;
  const brand = input.toString('latin1', 8, 12).toLowerCase();
  return /^(heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1|avif|avis|av01)$/.test(brand);
}

/** Cached answer from {@link heifDecodeSupported}. One probe per process. */
let heifSupport: boolean | null = null;

/**
 * Whether *this* sharp build can decode HEIF/HEIC, probed rather than assumed.
 *
 * PLATFORM DEPENDENCY — the reason this check exists at all. HEIC support is a
 * property of the libvips binary sharp was installed against, not of the sharp
 * version: npm's prebuilt binaries normally ship libheif, but a build compiled
 * without it (or a mismatched musl/glibc build) reports
 * `format.heif.input === false` and then throws on the very first HEIC byte.
 * There is no way to tell that apart from a corrupt file by reading the error
 * message, so the capability table is the only honest source.
 *
 * Probed once and cached: the loaded module cannot change capabilities without a
 * restart, and the answer gates an error path, not a hot loop.
 */
async function heifDecodeSupported(): Promise<boolean> {
  if (heifSupport === null) {
    try {
      const toSharp = await loadSharp();
      heifSupport = toSharp.format?.heif?.input === true;
    } catch {
      // sharp failed to load entirely. Leave the answer "unsupported": the
      // caller is already on an error path and E006 is the honest code.
      heifSupport = false;
    }
  }
  return heifSupport;
}

/** Longest edge of the source image, used to decide whether to resize. */
async function longestEdge(input: Buffer): Promise<number> {
  const toSharp = await loadSharp();
  const meta = await toSharp(input, { failOn: 'none' }).metadata();
  return Math.max(meta.width ?? 0, meta.height ?? 0);
}

/**
 * Convert one browser `File` with sharp.
 *
 * @deprecated Server code should use {@link convertWithSharpBuffer}. Retained
 *   because `server-converter.ts` still registers the `File`-shaped adapter.
 */
export async function convertWithSharp(
  file: File,
  target: string,
  options: ConversionOptions = {}
): Promise<Blob> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const output = await convertWithSharpBuffer(buffer, target, {
    quality: options.quality,
    maxDimension: options.maxDimension,
    // The legacy option is the inverse of the new one.
    preserveMetadata: options.stripMetadata === false,
  });
  return new Blob([new Uint8Array(output)], { type: getFormatMeta(target).mimeType });
}

/**
 * The adapter as consumed by the router registry.
 *
 * `canDecode` lists only what the installed build really opens. Claiming `bmp`
 * or `dng` here would let the router pick sharp for a file it cannot read.
 */
export const sharpAdapter: EngineAdapter = {
  kind: 'SERVER_SHARP' as EngineKind,
  runtime: 'server',
  canDecode: ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'avif', 'gif', 'tiff', 'tif', 'heic', 'heif'],
  canEncode: Object.keys(SHARP_OUTPUTS),
  convert: convertWithSharp,
};

/** sharp's own version string, for `GET /api/health`. */
export async function sharpVersion(): Promise<string | null> {
  try {
    const toSharp = await loadSharp();
    return toSharp.versions?.sharp ?? null;
  } catch {
    return null;
  }
}
