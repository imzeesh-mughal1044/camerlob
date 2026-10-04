/**
 * lib/convert/engines/imagemagick.ts
 * ImageMagick adapter: the universal server fallback.
 *
 * WHY THIS ENGINE EXISTS
 * ------------------------------------------------------------------------
 * It is the only engine with delegates for BMP, ICO, PDF, HEIC and the layered
 * containers (PSD, PSB, XCF, Publisher, OpenDocument). Everything it can do that
 * sharp can also do, sharp does faster, in-process, without a temp file — so
 * this adapter is reached only when the matrix says the source or the target is
 * outside sharp's reach. It is also the documented RAW fallback when LibRaw is
 * missing, because ImageMagick ships a dcraw delegate.
 *
 * HOW IT IS INVOKED
 * ------------------------------------------------------------------------
 * `spawn` with an argument array and `shell: false`, never a command string.
 * A filename is attacker-controlled data; the moment it is interpolated into a
 * shell string, a name like `a;rm -rf ~.jpg` is a shell command. The argument
 * array makes that class of bug unrepresentable.
 *
 * Two ImageMagick generations are in the wild: IM7 exposes `magick`, IM6 only
 * `convert`. Both spellings are tried, because a machine with IM6 installed
 * reports ImageMagick as present and then fails every conversion otherwise.
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ConversionError } from '@/lib/constants/errors';
import { getFormatMeta } from '@/lib/constants/formats';
import { DEFAULT_QUALITY, ENGINE_TIMEOUT_MS } from '@/lib/constants/limits';
import { detectFormatFromBuffer } from '@/lib/utils/magic-bytes';
import { binaryFor } from '@/lib/convert/engines/detect';
import { isBinaryMissing, runBinary, type RunResult } from '@/lib/convert/engines/spawn';
import type { EngineConversionOptions } from '@/types/conversion';
import type { ConversionOptions, EngineAdapter, EngineKind } from '@/types/engine';

/**
 * ImageMagick's own name for each matrix target.
 *
 * IM7 accepts these as the output filename suffix, but the explicit
 * `FORMAT:` prefix is honoured by both generations and removes any doubt about
 * which coder runs.
 */
type ImageMagickTarget =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'gif'
  | 'tiff'
  | 'bmp'
  | 'ico'
  | 'heic'
  | 'pdf';

const IM_OUTPUTS: Readonly<Record<string, ImageMagickTarget>> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jfif: 'jpeg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  tiff: 'tiff',
  tif: 'tiff',
  bmp: 'bmp',
  ico: 'ico',
  heic: 'heic',
  heif: 'heic',
  pdf: 'pdf',
};

/** Output filename suffix per target, for the temp file. */
const SUFFIX: Readonly<Record<ImageMagickTarget, string>> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  tiff: 'tif',
  bmp: 'bmp',
  ico: 'ico',
  heic: 'heic',
  pdf: 'pdf',
};

/** Raster density for PDF output. 150dpi keeps text legible without a huge file. */
const PDF_DENSITY = 150;

/** Icon sizes written into a multi-resolution `.ico`. */
const ICO_SIZES = '256,128,64,48,32,16';

/**
 * Build the ImageMagick argument list for a conversion.
 *
 * Exported for the test harness: an argv is much easier to assert on than the
 * behaviour of a binary that may not be installed.
 */
export function imagemagickArgs(
  inputPath: string,
  outputPath: string,
  target: ImageMagickTarget,
  options: EngineConversionOptions
): string[] {
  const quality = options.quality ?? DEFAULT_QUALITY;
  const args: string[] = [];

  // Apply the EXIF orientation before anything else, so a rotated phone photo
  // is not written out sideways.
  args.push('-auto-orient');

  // Work in sRGB rather than the source's colourspace. Without this, CMYK or
  // AdobeRGB sources shift visibly once displayed on an sRGB page.
  args.push('-colorspace', 'sRGB');

  // Strip GPS and camera metadata by default. `-strip` is a privacy default,
  // not a size optimisation.
  if (options.preserveMetadata !== true) args.push('-strip');

  switch (target) {
    case 'jpeg':
      args.push('-quality', String(quality), '-interlace', 'Plane');
      break;
    case 'png':
      args.push('-quality', String(quality), '-define', 'png:compression-level=9');
      break;
    case 'webp':
      args.push('-quality', String(quality), '-define', 'webp:method=4');
      break;
    case 'avif':
      args.push('-quality', String(options.quality ?? 80));
      break;
    case 'tiff':
      args.push('-compress', 'lzw');
      break;
    case 'gif':
      args.push('-layers', 'Optimize');
      break;
    case 'ico':
      // One .ico holding several sizes, which is what Windows expects.
      args.push('-define', `icon:auto-resize=${ICO_SIZES}`);
      break;
    case 'heic':
      args.push('-quality', String(quality));
      break;
    case 'pdf':
      args.push('-density', String(PDF_DENSITY));
      // A transparent source becomes an invisible page on white paper unless
      // the alpha channel is composited away first.
      args.push('-background', 'white', '-alpha', 'remove', '-alpha', 'off');
      break;
    case 'bmp':
      break;
  }

  // Input last, output first: ImageMagick's argument order is
  // `magick [input flags] input output`, and putting the input at the end keeps
  // the flags unambiguous.
  return [inputPath, ...args, `${target}:${outputPath}`];
}

/**
 * Convert bytes with ImageMagick.
 *
 * @param input Raw source bytes.
 * @param target Matrix target id.
 * @param options Quality, metadata and animation policy.
 * @returns The encoded bytes; the caller owns the buffer.
 * @throws ConversionError `E001` unsupported target, `E006` binary missing,
 *   `E007` timeout, `E004` undecodable source.
 */
export async function convertWithImageMagick(
  input: Buffer,
  target: string,
  options: EngineConversionOptions = {}
): Promise<Buffer> {
  const id = target.toLowerCase();
  const format = IM_OUTPUTS[id];
  if (!format) {
    throw new ConversionError('E001', `ImageMagick cannot write ${target}`, { format: target });
  }
  if (input.length === 0) {
    throw new ConversionError('E004', 'ImageMagick received an empty buffer', { format: target });
  }

  // A private directory per job. Files land in the OS temp dir, never inside
  // the project, and the whole directory goes away in the `finally` below.
  const jobDir = await mkdtemp(path.join(tmpdir(), 'camerlob-im-'));
  const timeoutMs = options.timeoutMs ?? ENGINE_TIMEOUT_MS;

  try {
    // Give the input a truthful extension. ImageMagick sniffs content, but
    // several delegates dispatch on the suffix and refuse a mismatched one.
    const detected = options.sourceFormat ?? detectFormatFromBuffer(input);
    const inputPath = path.join(jobDir, `input.${detected ?? 'img'}`);
    await writeFile(inputPath, input, { mode: 0o600 });

    const outputPath = path.join(jobDir, `output.${SUFFIX[format]}`);

    // An animated source carries more frames than a still target can hold, and
    // ImageMagick would write out-0.png, out-1.png... instead of the one file
    // asked for. `[0]` selects the first frame, matching sharp's default.
    const firstFrameOnly = options.preserveAnimation !== true && format !== 'gif';
    const effectiveInput = firstFrameOnly ? `${inputPath}[0]` : inputPath;

    const args = imagemagickArgs(effectiveInput, outputPath, format, options);
    const result = await runMagick(args, timeoutMs);

    if (!result.ok) {
      throw classify(result, id);
    }

    return await readFile(outputPath);
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError('E005', message, { format: target }, { cause: error });
  } finally {
    // Runs on success, on a native failure and on a timeout alike. A leaked
    // temp file per request is a disk exhaustion bug, not a tidiness issue.
    await rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Run ImageMagick, tolerating both the IM7 and IM6 command names.
 *
 * `binaryFor` honours `IMAGEMAGICK_PATH`. When that is unset and IM7's `magick`
 * is absent, IM6's `convert` is tried before giving up — a machine can have
 * ImageMagick installed and still lack `magick`.
 */
async function runMagick(args: readonly string[], timeoutMs: number): Promise<RunResult> {
  const configured = binaryFor('imagemagick');
  const attempts = configured === 'convert' ? ['convert'] : [configured, 'convert'];

  let lastError: unknown = null;
  for (const binary of attempts) {
    try {
      return await runBinary(binary, args, { timeoutMs });
    } catch (error) {
      // ENOENT on the first spelling may still succeed on the second.
      if (isBinaryMissing(error) && binary !== attempts[attempts.length - 1]) {
        lastError = error;
        continue;
      }
      if (isBinaryMissing(error)) {
        throw new ConversionError(
          'E006',
          'ImageMagick is not installed. Run `pnpm check-engines`.',
          {},
          { cause: error }
        );
      }
      throw error;
    }
  }
  throw new ConversionError('E006', 'ImageMagick is not installed.', {}, { cause: lastError });
}

/** Map a non-zero ImageMagick exit onto the error table. */
function classify(result: RunResult, target: string): ConversionError {
  const stderr = result.stderr.trim();
  const detail = stderr.length > 0 ? stderr : `ImageMagick exited with code ${result.exitCode}`;

  // Timeouts arrive as an E007 already, but a native run can also report a
  // hang in its own words.
  if (/timed out|timeout/i.test(stderr)) {
    return new ConversionError('E007', detail, { format: target });
  }
  if (/no decode delegate|unable to (read|open)|improper image header|corrupt/i.test(stderr)) {
    return new ConversionError('E004', detail, { format: target });
  }
  if (/no encode delegate|unable to write/i.test(stderr)) {
    return new ConversionError('E001', detail, { format: target });
  }
  return new ConversionError('E005', detail, { format: target });
}

/**
 * Convert one browser `File` with ImageMagick.
 *
 * @deprecated Server code should use {@link convertWithImageMagick}.
 */
export async function convertWithImageMagickFile(
  file: File,
  target: string,
  options: ConversionOptions = {}
): Promise<Blob> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const output = await convertWithImageMagick(buffer, target, {
    quality: options.quality,
    preserveMetadata: options.stripMetadata === false,
  });
  return new Blob([new Uint8Array(output)], { type: getFormatMeta(target).mimeType });
}

/** The adapter as consumed by the router registry. */
export const imagemagickAdapter: EngineAdapter = {
  kind: 'SERVER_IMAGEMAGICK' as EngineKind,
  runtime: 'server',
  canDecode: [
    'jpg',
    'jpeg',
    'jfif',
    'png',
    'webp',
    'avif',
    'gif',
    'bmp',
    'ico',
    'tiff',
    'tif',
    'heic',
    'heif',
    'tga',
    'ppm',
    'psd',
    'psb',
    'xcf',
    'pub',
    'odd',
    'odg',
  ],
  canEncode: Object.keys(IM_OUTPUTS),
  convert: convertWithImageMagickFile,
};
