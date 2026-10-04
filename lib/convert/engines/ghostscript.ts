/**
 * lib/convert/engines/ghostscript.ts
 * Ghostscript adapter — rasterises PostScript-family vector art.
 *
 * WHAT THIS HANDLES
 * ------------------------------------------------------------------------
 * EPS, PS and XPS. These are the formats where "decode" and "render" are the
 * same operation: there is no pixel data to unpack, only drawing instructions
 * that have to be executed to produce a raster. Ghostscript is a PostScript
 * *interpreter*, and it is the only engine here that is one.
 *
 * TWO STAGES, LIKE LIBRAW
 * ------------------------------------------------------------------------
 * `gs` writes a raster (or, with the pdfwrite device, a PDF). It has no JPEG,
 * WebP or AVIF encoder, so anything that is not PNG, TIFF or PDF is finished
 * off by sharp:
 *
 *   1. gs -sDEVICE=png16m   EPS  ->  PNG
 *   2. sharp                PNG  ->  JPG/WebP/AVIF
 *
 * `-sDEVICE=png16m` rather than `pngmono`: EPS logos are frequently two-colour
 * but text and gradients are not, and a mono device would dither them into
 * stripes. 16m is also lossless, so the second stage compresses without having
 * thrown anything away.
 *
 * `-dSAFER` is not optional. PostScript is a Turing-complete language with
 * filesystem access, so rendering an untrusted EPS without the safe-mode
 * lockdown turns a file upload into arbitrary code execution. This is the
 * single most important flag in the file.
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ConversionError } from '@/lib/constants/errors';
import { getFormatMeta } from '@/lib/constants/formats';
import { DEFAULT_QUALITY, ENGINE_TIMEOUT_MS } from '@/lib/constants/limits';
import { convertWithSharpBuffer } from '@/lib/convert/engines/sharp';
import { binaryFor } from '@/lib/convert/engines/detect';
import { isBinaryMissing, isTimedOut, runBinary } from '@/lib/convert/engines/spawn';
import type { EngineConversionOptions } from '@/types/conversion';
import type { ConversionOptions, EngineAdapter, EngineKind } from '@/types/engine';

/** PostScript-family containers this adapter renders. */
const GS_SOURCES: readonly string[] = ['eps', 'ps', 'xps'];

/** Targets reachable after rasterisation. */
const GS_TARGETS: readonly string[] = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp', 'avif', 'pdf'];

/**
 * Raster resolution in DPI.
 *
 * EPS has no intrinsic pixel size — it is vector art — so resolution is the
 * only thing that decides the output dimensions. 150dpi is a good default for
 * on-screen use; print would want 300, and callers can ask for it.
 */
const DEFAULT_DPI = 150;

/** The binary this adapter shells out to, honouring the env override. */
export function ghostscriptBinary(): string {
  return binaryFor('ghostscript');
}

/** Report whether Ghostscript is callable on this machine. */
export async function probeGhostscript(): Promise<{
  available: boolean;
  version: string | null;
}> {
  const { probeVersion } = await import('@/lib/convert/engines/spawn');
  const version = await probeVersion(ghostscriptBinary(), ['--version']);
  return { available: version !== null, version };
}

/**
 * Choose the Ghostscript device for a target.
 *
 * `pdfwrite` is a real PDF producer, so a PDF target never needs the second
 * stage. Everything else rasterises through `png16m`, which is lossless 16-bit
 * RGB: the right device for art that is not strictly two-colour, so a logo with
 * anti-aliased edges or a gradient does not arrive dithered into stripes.
 */
function deviceFor(target: string): string {
  return target === 'pdf' ? 'pdfwrite' : 'png16m';
}

/**
 * Build the `gs` argument list.
 *
 * Exported for the test harness so the flags can be asserted without Ghostscript
 * being installed.
 */
export function ghostscriptArgs(
  inputPath: string,
  outputPath: string,
  target: string,
  options: EngineConversionOptions = {}
): string[] {
  const dpi = options.dpi ?? DEFAULT_DPI;
  const device = deviceFor(target);

  const args = [
    // Safe mode. Non-negotiable for untrusted input; see the file header.
    '-dSAFER',
    // No interactive prompt, one job per process.
    '-dBATCH',
    '-dNOPAUSE',
    // Suppress the startup banner so stderr carries only real errors.
    '-dQUIET',
    `-sDEVICE=${device}`,
    `-r${dpi}`,
    // Crop to the artwork's bounding box instead of a full US Letter page, so a
    // small logo does not come back mostly whitespace.
    '-dEPSCrop',
    // Render transparent art against white. An EPS has no alpha channel, and
    // leaving the page background unset yields black fills on some builds.
    '-dBackgroundColor=16#ffffff',
    '-dAlignToPixels=0',
    '-dGridFitTT=0',
    '-dTextAlphaBits=4',
    '-dGraphicsAlphaBits=4',
    `-sOutputFile=${outputPath}`,
  ];

  // Only PDF output accepts a quality setting; the raster devices are lossless
  // and are compressed by the second stage instead.
  if (target === 'pdf') {
    // /prepress keeps embedded images at full quality rather than downsampling
    // them to 300dpi, which matters for a logo that will be printed.
    args.push('-dPDFSETTINGS=/prepress', '-dCompatibilityLevel=1.7');
  }

  args.push(inputPath);
  return args;
}

/** Map a non-zero `gs` exit onto the error table. */
function classify(stderr: string, exitCode: number | null, target: string): ConversionError {
  const detail = stderr.trim() || `Ghostscript exited with code ${exitCode}`;

  if (/undefinedfilename|can't find|failed to open|no such file/i.test(detail)) {
    return new ConversionError('E004', detail, { format: target });
  }
  if (/invalidaccess|error in .*\/font|unrecoverable|syntaxerror/i.test(detail)) {
    // A malformed or hostile PostScript program. The file is not a usable EPS.
    return new ConversionError('E004', detail, { format: target });
  }
  if (/vmreclaim|out of memory|cannot allocate/i.test(detail)) {
    return new ConversionError('E008', detail, { format: target });
  }
  return new ConversionError('E005', detail, { format: target });
}

/**
 * Render one PostScript-family file and encode it to `target`.
 *
 * @param input EPS/PS/XPS bytes.
 * @param target Matrix target id.
 * @param options Quality, metadata and `dpi` for the rasterisation.
 * @returns The encoded bytes; the caller owns the buffer.
 * @throws ConversionError `E001` unsupported pair, `E004` unrenderable source,
 *   `E006` binary missing, `E007` timeout.
 */
export async function convertWithGhostscript(
  input: Buffer,
  target: string,
  options: EngineConversionOptions = {}
): Promise<Buffer> {
  const id = target.toLowerCase();

  if (!GS_TARGETS.includes(id)) {
    throw new ConversionError('E001', `Ghostscript cannot write ${target}`, { format: target });
  }
  if (input.length === 0) {
    throw new ConversionError('E004', 'Ghostscript received an empty buffer', { format: target });
  }

  const source = (options.sourceFormat ?? 'eps').toLowerCase();
  if (!GS_SOURCES.includes(source)) {
    throw new ConversionError('E001', `Ghostscript cannot read ${source}`, { format: source });
  }

  const jobDir = await mkdtemp(path.join(tmpdir(), 'camerlob-gs-'));
  const timeoutMs = options.timeoutMs ?? ENGINE_TIMEOUT_MS;

  try {
    const inputPath = path.join(jobDir, `input.${source}`);
    await writeFile(inputPath, input, { mode: 0o600 });

    const isPdf = id === 'pdf';
    const outputPath = path.join(jobDir, isPdf ? 'output.pdf' : 'output.png');

    const result = await runBinary(
      ghostscriptBinary(),
      ghostscriptArgs(inputPath, outputPath, id, options),
      { timeoutMs }
    ).catch((error: unknown) => {
      if (isBinaryMissing(error)) {
        throw new ConversionError(
          'E006',
          'Ghostscript is not installed. Run `pnpm check-engines`.',
          {},
          { cause: error }
        );
      }
      if (isTimedOut(error)) {
        throw new ConversionError(
          'E007',
          `Ghostscript exceeded ${timeoutMs}ms and was killed`,
          { format: target },
          { cause: error }
        );
      }
      throw error;
    });

    if (!result.ok) {
      throw classify(result.stderr, result.exitCode, id);
    }

    const rendered = await readFile(outputPath);

    // pdfwrite produced the final artefact; nothing left to do.
    if (isPdf) return rendered;
    // png16m produced a PNG. A PNG target is already correct.
    if (id === 'png') return rendered;

    return await convertWithSharpBuffer(rendered, id, {
      ...options,
      quality: options.quality ?? DEFAULT_QUALITY,
    });
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError('E005', message, { format: target }, { cause: error });
  } finally {
    await rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Convert one browser `File` with Ghostscript.
 *
 * @deprecated Server code should use {@link convertWithGhostscript}.
 */
export async function convertWithGhostscriptFile(
  file: File,
  target: string,
  options: ConversionOptions = {}
): Promise<Blob> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const output = await convertWithGhostscript(buffer, target, {
    quality: options.quality,
    preserveMetadata: options.stripMetadata === false,
  });
  return new Blob([new Uint8Array(output)], { type: getFormatMeta(target).mimeType });
}

/** The adapter as consumed by the router registry. */
export const ghostscriptAdapter: EngineAdapter = {
  kind: 'SERVER_GHOSTSCRIPT' as EngineKind,
  runtime: 'server',
  canDecode: [...GS_SOURCES],
  canEncode: [...GS_TARGETS],
  convert: convertWithGhostscriptFile,
};
