/**
 * lib/convert/engines/libraw.ts
 * LibRaw adapter — develops camera RAW into a raster that sharp can encode.
 *
 * WHY THIS IS TWO STAGES
 * ------------------------------------------------------------------------
 * `dcraw_emu` can only develop a sensor file into an *uncompressed* TIFF or
 * PPM. It has no JPEG, WebP or AVIF encoder, and neither does any RAW decoder —
 * the format is a container for sensor data, not a picture format. So the work
 * is genuinely two jobs:
 *
 *   1. dcraw_emu: CR2/CR3/NEF/...  ->  16-bit TIFF      (decode + demosaic)
 *   2. sharp:     16-bit TIFF       ->  JPG/PNG/WebP/AVIF  (encode)
 *
 * This is why the matrix names `libraw` as the engine for every RAW pair even
 * when the target is a plain JPEG: LibRaw is the engine that must run, and the
 * second stage is an implementation detail of this adapter.
 *
 * `dng` is the exception. DNG is itself a RAW container, so `cr2 -> dng` is a
 * *remux*: re-wrapping sensor data as DNG would discard the original maker
 * notes and calibration. The bytes are passed through untouched.
 *
 * A shorter, much faster path exists for JPEG conversion: `dcraw_emu -e` pulls
 * the embedded JPEG preview straight out of the file. It is not offered here,
 * because the preview is a lower-resolution, often differently-processed image
 * than the sensor data, and silently returning it would be a quiet lie about
 * what the user received.
 */

import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ConversionError } from '@/lib/constants/errors';
import { getFormatMeta } from '@/lib/constants/formats';
import { ENGINE_TIMEOUT_RAW_MS } from '@/lib/constants/limits';
import { convertWithSharpBuffer } from '@/lib/convert/engines/sharp';
import { binaryFor } from '@/lib/convert/engines/detect';
import { isBinaryMissing, isTimedOut, runBinary } from '@/lib/convert/engines/spawn';
import type { EngineConversionOptions } from '@/types/conversion';
import type { ConversionOptions, EngineAdapter, EngineKind } from '@/types/engine';

/** RAW containers this adapter develops, mirroring the format registry. */
const LIBRAW_SOURCES: readonly string[] = [
  'cr2',
  'cr3',
  'crw',
  'nef',
  'arw',
  'dng',
  'orf',
  'raf',
  'rw2',
  'pef',
  '3fr',
  'mrw',
  'dcr',
  'erf',
  'mos',
  'x3f',
];

/**
 * Targets reachable once the RAW has been developed to a raster.
 *
 * `dng` is a remux rather than an encode; the rest go through sharp.
 */
const LIBRAW_TARGETS: readonly string[] = [
  'jpg',
  'jpeg',
  'png',
  'tiff',
  'tif',
  'webp',
  'avif',
  'dng',
];

/** The binary this adapter shells out to, honouring the env override. */
export function librawBinary(): string {
  return binaryFor('libraw');
}

/**
 * Report whether LibRaw is callable on this machine.
 * Mirrors `probeImagemagick` in `imagemagick.ts` so the health route can treat
 * every engine probe identically.
 */
export async function probeLibraw(): Promise<{ available: boolean; version: string | null }> {
  const { probeVersion } = await import('@/lib/convert/engines/spawn');
  // dcraw_emu does not implement `-v` as "print version". With no arguments
  // it prints its usage banner and exits non-zero, which is a valid "found"
  // signal. Any captured output means the binary is alive. Kept in step with
  // the libraw entry in `detect.ts` so both paths give the same answer.
  const version = await probeVersion(librawBinary(), []);
  return { available: version !== null, version };
}

/**
 * Build the `dcraw_emu` argument list.
 *
 * -c  write a TIFF rather than PPM/PGM
 * -T  16 bits per channel, which matters: 8-bit development of a 14-bit sensor
 *     file throws away most of the dynamic range the RAW exists to preserve
 * -w  apply the camera's white balance, the correct default for a conversion
 *     tool that has no rendering intent to honour
 * -h  half-size. A 50MP file becomes 12MP, which is faster and is what a
 *     converted web image is for. Callers wanting full resolution drop this.
 * -q 3  light noise reduction; higher values smooth detail away
 *
 * Half-size development is the default because a converted image is usually for
 * screen use, and halving both dimensions cuts the pixel count — and so the
 * encode time and memory — by a factor of four. A caller that sets
 * `maxDimension` is asking for a particular output size, which `dcraw_emu`
 * cannot honour directly (its only size control is the `-h` halving), so full
 * resolution is developed and the second stage's sharp resizes to fit. That
 * costs more than halving up front, but it is the only way to actually hit the
 * requested size.
 */
export function librawArgs(inputPath: string, options: EngineConversionOptions = {}): string[] {
  const args = ['-c', '-T', '-w', '-q', '3'];
  if (options.maxDimension === undefined) args.push('-h');
  args.push(inputPath);
  return args;
}

/** Map a non-zero `dcraw_emu` exit onto the error table. */
function classify(stderr: string, exitCode: number | null, target: string): ConversionError {
  const detail = stderr.trim() || `dcraw_emu exited with code ${exitCode}`;

  // LibRaw reports an unsupported maker with these; the file is simply not a
  // RAW format this build understands, which is a corrupt/unsupported input.
  if (
    /unsupported|cannot decode|unknown (raw|camera)|not a raw|bad file|end of file/i.test(detail)
  ) {
    return new ConversionError('E004', detail, { format: target });
  }
  if (/out of memory|cannot allocate/i.test(detail)) {
    return new ConversionError('E008', detail, { format: target });
  }
  return new ConversionError('E005', detail, { format: target });
}

/**
 * Develop one RAW file and encode it to `target`.
 *
 * @param input Raw source bytes.
 * @param target Matrix target id, e.g. `jpg` or `dng`.
 * @param options Quality, metadata, and `maxDimension` (0 or absent means
 *   half-size development).
 * @returns The encoded bytes; the caller owns the buffer.
 * @throws ConversionError `E001` unsupported pair, `E004` undecodable RAW,
 *   `E006` binary missing, `E007` timeout.
 */
export async function convertWithLibRaw(
  input: Buffer,
  target: string,
  options: EngineConversionOptions = {}
): Promise<Buffer> {
  const id = target.toLowerCase();

  if (!LIBRAW_TARGETS.includes(id)) {
    throw new ConversionError('E001', `LibRaw cannot write ${target}`, { format: target });
  }
  if (input.length === 0) {
    throw new ConversionError('E004', 'LibRaw received an empty buffer', { format: target });
  }

  const source = (options.sourceFormat ?? 'dng').toLowerCase();
  if (!LIBRAW_SOURCES.includes(source)) {
    throw new ConversionError('E001', `LibRaw cannot read ${source}`, { format: source });
  }

  // cr2 -> dng (and dng -> dng) is a remux. Re-developing would throw away the
  // maker notes and per-camera calibration that make a RAW file a RAW file.
  if (id === 'dng') return Buffer.from(input);

  const jobDir = await mkdtemp(path.join(tmpdir(), 'camerlob-raw-'));
  // RAW development is legitimately slow — a 50MP file with noise reduction is
  // not a hang — so it gets the longer budget, not the standard one.
  const timeoutMs = options.timeoutMs ?? ENGINE_TIMEOUT_RAW_MS;

  try {
    // dcraw_emu derives its output name from the input basename, replacing the
    // extension, so `input.cr2` produces `input.tiff` in the same directory.
    const inputPath = path.join(jobDir, `input.${source}`);
    await writeFile(inputPath, input, { mode: 0o600 });

    const result = await runBinary(librawBinary(), librawArgs(inputPath, options), {
      timeoutMs,
    }).catch((error: unknown) => {
      if (isBinaryMissing(error)) {
        throw new ConversionError(
          'E006',
          'LibRaw is not installed. Run `pnpm check-engines`.',
          {},
          { cause: error }
        );
      }
      if (isTimedOut(error)) {
        throw new ConversionError(
          'E007',
          `LibRaw exceeded ${timeoutMs}ms and was killed`,
          { format: target },
          { cause: error }
        );
      }
      throw error;
    });

    if (!result.ok) {
      throw classify(result.stderr, result.exitCode, id);
    }

    const developed = await readDevelopedTiff(jobDir, target);

    // Second stage: sharp encodes the 16-bit TIFF into the requested format.
    // A TIFF target is already what dcraw produced, so it is returned as-is
    // rather than being losslessly re-wrapped for no reason.
    if (id === 'tiff' || id === 'tif') return developed;

    return await convertWithSharpBuffer(developed, id, options);
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError('E005', message, { format: target }, { cause: error });
  } finally {
    // A 16-bit TIFF of a 50MP sensor file is roughly 100MB. Leaking one per
    // request fills a temp filesystem quickly, so this must run on every path.
    await rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Find the TIFF `dcraw_emu` wrote.
 *
 * The filename is derived from the input basename, but a dcraw build with
 * different options can pick a different extension, so the directory is listed
 * rather than assuming `input.tiff` exists.
 */
async function readDevelopedTiff(jobDir: string, target: string): Promise<Buffer> {
  let entries: string[];
  try {
    entries = await readdir(jobDir);
  } catch (error) {
    throw new ConversionError(
      'E005',
      'LibRaw produced no output file',
      { format: target },
      { cause: error }
    );
  }

  const produced = entries.filter(
    (name) => name !== 'input.dng' && /\.(tiff?|ppm?|pgm)$/i.test(name)
  );
  if (produced.length === 0) {
    throw new ConversionError('E004', 'LibRaw produced no readable output', { format: target });
  }

  return readFile(path.join(jobDir, produced[0] as string));
}

/**
 * Convert one browser `File` with LibRaw.
 *
 * @deprecated Server code should use {@link convertWithLibRaw}.
 */
export async function convertWithLibRawFile(
  file: File,
  target: string,
  options: ConversionOptions = {}
): Promise<Blob> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const output = await convertWithLibRaw(buffer, target, {
    quality: options.quality,
    maxDimension: options.maxDimension,
    preserveMetadata: options.stripMetadata === false,
  });
  return new Blob([new Uint8Array(output)], { type: getFormatMeta(target).mimeType });
}

/** The adapter as consumed by the router registry. */
export const librawAdapter: EngineAdapter = {
  kind: 'SERVER_LIBRAW' as EngineKind,
  runtime: 'server',
  canDecode: [...LIBRAW_SOURCES],
  canEncode: [...LIBRAW_TARGETS],
  convert: convertWithLibRawFile,
};
