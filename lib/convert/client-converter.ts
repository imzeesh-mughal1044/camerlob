/**
 * lib/convert/client-converter.ts
 * Browser conversion entry point. Dispatches to the Canvas path, the HEIC path
 * or the WASM path, in that order of preference.
 *
 * Imports nothing from the server: this module is safe in any browser bundle
 * and never touches `child_process`, `fs` or `sharp`.
 */

import {
  canEncode,
  convertViaCanvas,
  decodeToImageBitmap,
  decodeToImageElement,
} from '@/lib/convert/canvas';
import { canBrowserConvert } from '@/lib/convert/formats';
import { canConvertHeicTo, convertHeic, isHeic } from '@/lib/convert/heic';
import { ConversionError } from '@/lib/constants/errors';
import { DEFAULT_QUALITY, MAX_FILE_SIZE_BYTES } from '@/lib/constants/limits';
import type { ConversionOptions, EngineKind } from '@/types/engine';

/** Result of a client-side conversion. */
export interface ClientConversionResult {
  readonly blob: Blob;
  /** Which client engine actually ran. */
  readonly engine: EngineKind;
  /** True when the browser could not service the pair and a server is needed. */
  readonly needsServer: boolean;
  /** Why the client path declined, when it did. */
  readonly reason: string | null;
}

/** Feature-detect the browser capabilities the client engine depends on. */
export function detectClientCapabilities(): {
  canvas: boolean;
  imageBitmap: boolean;
  webAssembly: boolean;
  heic2any: boolean;
} {
  return {
    canvas: typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined',
    imageBitmap: typeof createImageBitmap === 'function',
    webAssembly:
      typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function',
    // heic2any is a dynamic import; assume available until it throws E005.
    heic2any: typeof window !== 'undefined',
  };
}

/** True when this browser can attempt the pair at all. */
export function canConvertClientSide(source: string, target: string): boolean {
  if (isHeic(source)) return canConvertHeicTo(target);
  return canEncode(target);
}

/** Why a pair was or was not routed to the browser. */
export interface ClientSideDecision {
  /** True when the pair should be attempted in the browser. */
  readonly useClient: boolean;
  /** One sentence, safe to show in the UI or return from the API. */
  readonly reason: string;
}

/**
 * Decide whether a pair should run in the browser.
 *
 * Two things have to be true, and conflating them is the usual bug:
 *
 *  1. The browser must be *able* to do it. `canBrowserConvert` is the authority,
 *     and it is the same predicate the server router reads, so the two cannot
 *     disagree about what a browser can do.
 *  2. The caller must *want* it. Converting in the browser keeps the file off
 *     the network, which is the point of the client bridge, but it also burns the
 *     user's RAM and CPU. So it is opt-in, and a caller that asks for the server
 *     gets the server.
 *
 * A `File` larger than the client memory ceiling is never attempted in the
 * browser: a 100MB decode in a tab is an E008 waiting to happen, and the file
 * has to be uploaded eventually anyway.
 *
 * @param fileSizeBytes Size of the input, when known. Omit to skip the size test.
 */
export function shouldUseClientSide(
  sourceFormat: string,
  targetFormat: string,
  options: { readonly preferClient?: boolean; readonly fileSizeBytes?: number } = {}
): ClientSideDecision {
  const source = sourceFormat.toLowerCase();
  const target = targetFormat.toLowerCase();

  if (!canBrowserConvert(source, target)) {
    return {
      useClient: false,
      reason: `${source.toUpperCase()} to ${target.toUpperCase()} needs a native engine, so it runs on the server.`,
    };
  }

  if (options.preferClient !== true) {
    return {
      useClient: false,
      reason: 'The server engine is preferred by default; the browser is used when asked.',
    };
  }

  if (options.fileSizeBytes !== undefined && options.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    // Above the client ceiling the tab runs out of memory long before the
    // server would, so this is a downgrade, not an optimisation.
    return {
      useClient: false,
      reason: `File is larger than the ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB browser limit, so it is uploaded instead.`,
    };
  }

  return {
    useClient: true,
    reason: `${source.toUpperCase()} to ${target.toUpperCase()} runs entirely in your browser; the file is never uploaded.`,
  };
}

/**
 * Convert one file in the browser.
 *
 * Never throws for an unsupported pair: it returns `needsServer: true` so the
 * router can escalate. Genuine failures throw a `ConversionError` carrying
 * E004 (bad input) or E005 (engine failure).
 */
export async function convertOnClient(
  file: File,
  source: string,
  target: string,
  options: ConversionOptions = {}
): Promise<ClientConversionResult> {
  if (!canConvertClientSide(source, target)) {
    return {
      blob: null as unknown as Blob,
      engine: 'CLIENT_CANVAS',
      needsServer: true,
      reason: `${source} -> ${target} is not a browser-supported pair`,
    };
  }

  // HEIC first: it has no canvas path at all.
  if (isHeic(source)) {
    const blob = await convertHeic(file, target, options.quality ?? DEFAULT_QUALITY);
    return { blob, engine: 'CLIENT_HEIC', needsServer: false, reason: null };
  }

  const capabilities = detectClientCapabilities();
  if (!capabilities.canvas) {
    throw new ConversionError('E005', 'No canvas support in this environment');
  }

  let source_: ImageBitmap | HTMLImageElement;
  try {
    source_ = capabilities.imageBitmap
      ? await decodeToImageBitmap(file)
      : await decodeToImageElement(file);
  } catch (error) {
    // A decode failure is an input problem, not an engine problem: E004.
    if (error instanceof ConversionError) throw error;
    throw new ConversionError(
      'E004',
      `Client decode failed for ${file.name}`,
      {},
      { cause: error }
    );
  }

  try {
    const { blob } = await convertViaCanvas(source_, target, options);
    return { blob, engine: 'CLIENT_CANVAS', needsServer: false, reason: null };
  } catch (error) {
    // The canvas engine can fail on formats it decodes but cannot encode;
    // that is a signal to escalate rather than to give up.
    if (error instanceof ConversionError && error.code === 'E004') throw error;
    return {
      blob: null as unknown as Blob,
      engine: 'CLIENT_CANVAS',
      needsServer: true,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Convert a whole batch client-side, capping concurrency. */
export async function convertBatchOnClient(
  files: readonly File[],
  source: string,
  target: string,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void,
  options: ConversionOptions = {}
): Promise<{ blobs: Blob[]; failures: { name: string; code: string; message: string }[] }> {
  const blobs: Blob[] = [];
  const failures: { name: string; code: string; message: string }[] = [];
  let cursor = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      const file = files[index];
      if (!file) return;

      try {
        const result = await convertOnClient(file, source, target, options);
        if (result.needsServer || !result.blob) {
          failures.push({ name: file.name, code: 'E005', message: 'Needs the server engine.' });
        } else {
          blobs.push(result.blob);
        }
      } catch (error) {
        const code = error instanceof ConversionError ? error.code : 'E009';
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ name: file.name, code, message });
      } finally {
        completed += 1;
        onProgress?.(completed, files.length);
      }
    }
  }

  const width = Math.max(1, Math.min(concurrency, files.length));
  await Promise.all(Array.from({ length: width }, () => worker()));
  return { blobs, failures };
}
