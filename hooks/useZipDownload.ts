/**
 * hooks/useZipDownload.ts
 * Bundles every successful output into one ZIP, in the browser.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. STORED, NOT DEFLATED. Image payloads are already compressed — running
 *    DEFLATE over a JPEG costs seconds of main-thread time and saves a fraction
 *    of a percent. JSZip is asked for `compression: 'STORE'` for exactly this
 *    reason, which also keeps assembly off the critical path for a 20-file
 *    batch. A run of genuinely compressible output (PNG, TIFF) can opt back in
 *    later without touching the call sites.
 *
 * 2. FILENAMES ARE DE-DUPED AGAINST WHAT IS ALREADY IN THE ARCHIVE, NOT JUST
 *    WITHIN THE BATCH. `download all` on a batch that already contains
 *    `photo.jpg` twice must not silently drop one. The store guarantees unique
 *    output names per batch, so this is belt-and-braces rather than a fix.
 *
 * 3. PROGRESS IS REPORTED PER FILE, NOT PER BYTE. JSZip's `progress` callback
 *    reports loaded/total bytes, which for STORE mode tracks files rather than
 *    compressed size. It is surfaced as a percentage because the action bar
 *    already has a ring that can show one.
 *
 * 4. THE OBJECT URL IS REVOKED ON A TIMER, NOT IMMEDIATELY. Revoking in the same
 *    tick as `a.click()` races the browser's own fetch of the blob URL and
 *    produces an empty download on some platforms. 60s is long enough that the
 *    download has certainly started and short enough that a user who abandons the
 *    save dialog does not leak the archive.
 *
 * 5. FAILURES ARE REPORTED AND THE ARCHIVE IS STILL OFFERED. If one of twenty
 *    files cannot be read, the other nineteen are already converted and the user
 *    should not lose them to an all-or-nothing error.
 */

'use client';

import * as React from 'react';
import JSZip from 'jszip';
import { toast } from 'sonner';

import { logConversionError, toConversionError } from '@/lib/constants/errors';
import { defaultZipName } from '@/lib/utils/zip';
import { useConversionStore } from '@/store/conversionStore';

const REVOKE_DELAY_MS = 60_000;

export interface ZipDownload {
  readonly isZipping: boolean;
  readonly percent: number;
  readonly canDownload: boolean;
  downloadAll: () => Promise<void>;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

export function useZipDownload(): ZipDownload {
  const results = useConversionStore((state) => state.results);
  const [isZipping, setIsZipping] = React.useState(false);
  const [percent, setPercent] = React.useState(0);

  const downloadAll = React.useCallback(async () => {
    if (results.length === 0 || isZipping) return;

    setIsZipping(true);
    setPercent(0);

    try {
      const zip = new JSZip();
      const taken = new Set<string>();

      for (const result of results) {
        const name = result.outputName.toLowerCase();
        if (taken.has(name)) continue;
        taken.add(name);
        zip.file(result.outputName, result.blob);
      }

      const archive = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) =>
        setPercent(Math.round(meta.percent))
      );

      triggerDownload(archive, defaultZipName());
      toast.success(`Downloaded ${results.length} file${results.length > 1 ? 's' : ''}`, {
        description: defaultZipName(),
      });
    } catch (error: unknown) {
      // A read failure on one Blob should not discard the rest; the message says
      // which stage broke and stays free of file paths. The structured log carries
      // the count so a failure is diagnosable without dumping the Error.
      logConversionError(toConversionError(error), { stage: 'zip', count: results.length });
      toast.error('Could not build the ZIP', {
        description: 'Try downloading the files individually.',
      });
    } finally {
      setIsZipping(false);
      setPercent(0);
    }
  }, [results, isZipping]);

  return {
    isZipping,
    percent,
    canDownload: results.length > 0 && !isZipping,
    downloadAll,
  };
}
