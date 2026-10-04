/**
 * lib/utils/mime.ts
 * Extension to MIME mapping and reverse lookup, seeded from the format
 * registry so a format is only described in one place.
 */

import { FORMAT_REGISTRY } from '@/lib/constants/formats';

/** Lowercase extension to MIME type, e.g. `jpg` to `image/jpeg`. */
const EXTENSION_TO_MIME: Readonly<Record<string, string>> = Object.freeze(
  Object.values(FORMAT_REGISTRY).reduce<Record<string, string>>((acc, meta) => {
    for (const extension of meta.extensions) {
      acc[extension.replace(/^\./, '').toLowerCase()] = meta.mimeType;
    }
    return acc;
  }, {})
);

/** MIME type to its canonical extension, without the dot. */
const MIME_TO_EXTENSION: Readonly<Record<string, string>> = Object.freeze(
  Object.entries(EXTENSION_TO_MIME).reduce<Record<string, string>>((acc, [ext, mime]) => {
    // First registration wins, so jpg stays the canonical extension for image/jpeg.
    if (!(mime in acc)) acc[mime] = ext;
    return acc;
  }, {})
);

/** Generic fallback for unknown extensions. */
export const FALLBACK_MIME = 'application/octet-stream';

/** Strip the leading dot and lowercase, so `.JPG` and `jpg` behave alike. */
export function normalizeExtension(extension: string): string {
  return extension.replace(/^\./, '').toLowerCase();
}

/** MIME type for a bare extension. Unknown extensions get the fallback. */
export function getMimeFromExtension(extension: string): string {
  return EXTENSION_TO_MIME[normalizeExtension(extension)] ?? FALLBACK_MIME;
}

/** Canonical extension for a MIME type, without the dot. */
export function getExtensionFromMime(mimeType: string): string {
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  return MIME_TO_EXTENSION[base] ?? 'bin';
}

/** Lowercase extension of a filename, without the dot. Empty when absent. */
export function getExtensionFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? '';
  const dotIndex = base.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === base.length - 1) return '';
  return normalizeExtension(base.slice(dotIndex + 1));
}

/** True when the extension is one Camerlob recognises. */
export function isKnownExtension(extension: string): boolean {
  return normalizeExtension(extension) in EXTENSION_TO_MIME;
}

/** Every extension Camerlob knows, sorted. */
export function knownExtensions(): readonly string[] {
  return Object.keys(EXTENSION_TO_MIME).sort();
}
