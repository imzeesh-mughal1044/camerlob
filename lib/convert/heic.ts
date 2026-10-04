/**
 * lib/convert/heic.ts
 * `heic2any` wrapper.
 *
 * The library is loaded with a dynamic import so that its roughly 2 MB payload
 * never enters the initial bundle: only users who actually pick a HEIC file pay
 * for it. Options and errors are normalised here so no caller has to know the
 * library's shape.
 */

import { ConversionError } from '@/lib/constants/errors';
import { DEFAULT_QUALITY } from '@/lib/constants/limits';

/** Minimal shape of the heic2any module, so the import stays type-safe. */
interface Heic2AnyModule {
  default: (options: {
    blob: Blob;
    toType: string;
    quality?: number;
    multiple?: boolean;
  }) => Promise<Blob | Blob[]>;
}

/** Formats HEIC can be transcoded to in the browser. */
export type HeicTarget = 'jpg' | 'png' | 'webp';

/** True when the extension is one the HEIC path handles. */
export function isHeic(extension: string): boolean {
  return ['heic', 'heif'].includes(extension.toLowerCase().replace(/^\./, ''));
}

/** Map a target extension to the MIME type heic2any expects. */
export function heicMimeFor(target: string): string {
  switch (target.toLowerCase().replace(/^\./, '')) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

/** True when a HEIC file can be converted to this target without a server. */
export function canConvertHeicTo(target: string): boolean {
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(
    target.toLowerCase().replace(/^\./, '')
  );
}

/**
 * Convert a HEIC or HEIF file in the browser.
 *
 * @param file The source HEIC file.
 * @param target Target format identifier.
 * @param quality Encoder quality, 1-100. Ignored for PNG.
 */
export async function convertHeic(
  file: File,
  target: string,
  quality: number = DEFAULT_QUALITY
): Promise<Blob> {
  if (!isHeic(file.name.split('.').pop() ?? '')) {
    throw new ConversionError('E001', `convertHeic called with a non-HEIC file: ${file.name}`);
  }
  if (!canConvertHeicTo(target)) {
    throw new ConversionError('E001', `HEIC cannot convert to ${target} in the browser`, {
      format: target.toUpperCase(),
    });
  }

  // Not named `module`: that is a CommonJS global, and shadowing it trips
  // no-shadow-restricted-names in a file that is bundled for the browser.
  let heic2any: Heic2AnyModule;
  try {
    heic2any = (await import('heic2any')) as unknown as Heic2AnyModule;
  } catch (cause) {
    throw new ConversionError(
      'E005',
      'heic2any failed to load; the WASM asset may be missing',
      {},
      { cause }
    );
  }

  try {
    const result = await heic2any.default({
      blob: file,
      toType: heicMimeFor(target),
      quality,
      multiple: false,
    });
    // The library returns an array when `multiple` is true; be defensive.
    const blob = Array.isArray(result) ? result[0] : result;
    if (!blob) {
      throw new ConversionError('E005', 'heic2any returned no output');
    }
    return blob;
  } catch (cause) {
    if (cause instanceof ConversionError) throw cause;
    throw new ConversionError('E005', `heic2any failed for ${file.name}`, {}, { cause });
  }
}
