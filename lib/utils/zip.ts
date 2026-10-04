/**
 * lib/utils/zip.ts
 * JSZip wrapper for batch download.
 *
 * Entry names are made unique deterministically rather than randomly, so that
 * downloading the same batch twice produces the same archive.
 */

import JSZip from 'jszip';

import { buildOutputFilename } from '@/lib/utils/sanitize-filename';

/** One entry to place in the archive. */
export interface ZipEntry {
  /** Original filename, used to derive the entry name. */
  readonly name: string;
  /** Target extension without the dot. */
  readonly targetExtension: string;
  readonly blob: Blob;
}

/** Metadata about the archive that was produced. */
export interface ZipResult {
  readonly blob: Blob;
  readonly entryCount: number;
  readonly uncompressedBytes: number;
}

/**
 * Build a ZIP archive from conversion results.
 *
 * @param entries Files to include. An empty list still yields a valid archive.
 * @param onProgress Optional progress callback, 0-100, for the progress bar.
 */
export async function buildZip(
  entries: readonly ZipEntry[],
  onProgress?: (percent: number) => void
): Promise<ZipResult> {
  const zip = new JSZip();
  const taken = new Set<string>();
  let uncompressedBytes = 0;

  for (const entry of entries) {
    const entryName = buildOutputFilename(entry.name, entry.targetExtension, taken);
    taken.add(entryName.toLowerCase());
    zip.file(entryName, entry.blob);
    uncompressedBytes += entry.blob.size;
  }

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      // STORE for already-compressed media: deflate would waste CPU for nothing.
      compression: 'STORE',
      compressionOptions: { level: 6 },
    },
    (meta) => {
      // JSZip reports a 0-100 `percent`; there is no `total` to divide by.
      if (onProgress) onProgress(Math.round(meta.percent));
    }
  );

  onProgress?.(100);
  return { blob, entryCount: entries.length, uncompressedBytes };
}

/** Default archive name: `camerlob-YYYY-MM-DD.zip`. */
export function defaultZipName(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  return `camerlob-${iso}.zip`;
}
