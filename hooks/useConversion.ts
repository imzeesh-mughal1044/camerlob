/**
 * hooks/useConversion.ts
 * Batch driver. Sends the whole queue to `POST /api/convert` as one multipart
 * request and folds the response back into the store.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. ONE REQUEST, NOT ONE PER FILE. The route accepts a `files` part with many
 *    entries and returns a per-file `results` and `failures` array. Twenty
 *    parallel requests would each pay for engine probing and would let the
 *    server's own concurrency limit fight the client's; one request is one unit
 *    of work the server can schedule, which is what its 3-at-a-time gate wants.
 *
 * 2. PROGRESS IS REAL, FROM `XMLHttpRequest.upload.onprogress`. `fetch` cannot
 *    report upload progress, so a genuine "your bytes are leaving" bar requires
 *    XHR. The bar is capped at 90% during upload because the server then spends
 *    time decoding and re-encoding offscreen, and a bar that sits at 100% while
 *    work continues is worse than one that waits at 90%.
 *
 * 3. THE SERVER'S `filename` IS USED AS-IS. It has already been sanitised and
 *    de-duplicated against the other files in the batch. Re-deriving it here
 *    from the original name would reintroduce the collisions the server just
 *    resolved.
 *
 * 4. `preserveAlpha` IS NOT SENT. The route's form fields are `preserveMetadata`
 *    and `preserveAnimation`; alpha is preserved by the engines when the target
 *    supports it. Mapping a field the route does not read would be a silent
 *    no-op dressed as a setting.
 *
 * 5. A FAILED RESPONSE THAT IS NOT JSON IS STILL A FAILURE. A proxy or a 500
 *    can answer with HTML; `responseType: 'json'` yields `null` and the batch is
 *    reported with E009 rather than throwing an unhandled parse error.
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { logConversionError, messageFor, toConversionError } from '@/lib/constants/errors';
import { errorMessage } from '@/lib/constants/messages';
import { DEFAULT_QUALITY } from '@/lib/constants/limits';
import { engineKindFor } from '@/lib/convert/formats';
import { dataUrlToBlob } from '@/lib/utils/download';
import { canConvert, useConversionStore } from '@/store/conversionStore';
import type { ConversionFailure, ConversionSummary } from '@/types/conversion';
import type { EngineName } from '@/types/engine';
import type { ConvertResponse } from '@/lib/validation/convert';

const STORE_INTERVAL_MS = 80;
const SETTLE_MS = 600;
/** Progress ceiling while the upload is in flight; only the response crosses it. */
const UPLOAD_CEILING = 90;

export interface Conversion {
  readonly isConverting: boolean;
  /** How many files have finished, for "Converting 3 of 7". */
  readonly completed: number;
  readonly total: number;
  readonly overallPercent: number;
  readonly canStart: boolean;
  start: () => void;
  /** Jump to /result immediately, skipping the settle. */
  goToResults: () => void;
  cancel: () => void;
}

export function useConversion(): Conversion {
  const router = useRouter();
  const files = useConversionStore((state) => state.files);
  const isConverting = useConversionStore((state) => state.isConverting);
  const startBatch = useConversionStore((state) => state.startBatch);
  const patchFile = useConversionStore((state) => state.patchFile);
  const finishBatch = useConversionStore((state) => state.finishBatch);

  const [completed, setCompleted] = React.useState(0);
  const cancelled = React.useRef(false);
  const running = React.useRef(false);
  const request = React.useRef<XMLHttpRequest | null>(null);

  // `canConvert` is the store's own guard, so this hook and the store cannot
  // disagree about when a batch is startable. Subscribing to it also removes the
  // staleness a hand-rolled `useMemo` would introduce.
  const canStart = useConversionStore(canConvert);

  React.useEffect(
    () => () => {
      cancelled.current = true;
      // A batch outlives the component that started it only if the user
      // navigates away mid-run; aborting keeps the socket from finishing work
      // whose result nobody will read.
      request.current?.abort();
    },
    []
  );

  const goToResults = React.useCallback(() => {
    router.push('/result');
  }, [router]);

  const start = React.useCallback(() => {
    if (running.current) return;

    const state = useConversionStore.getState();
    const { sourceFormat, targetFormat, files: batch, isConverting: alreadyRunning } = state;
    if (!sourceFormat || !targetFormat || batch.length === 0 || alreadyRunning) {
      toast.error('Nothing to convert', {
        description: 'Pick a source and a target, then add at least one file.',
      });
      return;
    }

    cancelled.current = false;
    running.current = true;
    setCompleted(0);
    startBatch();

    const startedAt = performance.now();
    const items = [...batch];

    const failAll = (code: string, message: string) => {
      const failures: ConversionFailure[] = items.map((item) => ({
        id: item.id,
        pair: item.pair,
        originalName: item.file.name,
        code,
        message,
        detail: message,
      }));
      const summary: ConversionSummary = {
        total: items.length,
        succeeded: 0,
        failed: items.length,
        totalInputBytes: items.reduce((sum, item) => sum + item.file.size, 0),
        totalOutputBytes: 0,
        durationMs: Math.round(performance.now() - startedAt),
      };
      finishBatch([], failures, summary);
      setCompleted(items.length);
    };

    const form = new FormData();
    for (const item of items) form.append('files', item.file, item.file.name);
    form.append('sourceFormat', sourceFormat);
    form.append('targetFormat', targetFormat);
    // Options are per-item but homogeneous for a batch; the first item speaks
    // for the batch, which is the same assumption the single pair relies on.
    const options = items[0]?.options;
    form.append('quality', String(options?.quality ?? DEFAULT_QUALITY));
    form.append('preserveMetadata', String(!options?.stripMetadata));
    if (options?.maxDimension) form.append('maxDimension', String(options.maxDimension));

    const xhr = new XMLHttpRequest();
    request.current = xhr;
    xhr.open('POST', '/api/convert');
    xhr.responseType = 'json';
    xhr.setRequestHeader('accept', 'application/json');

    let lastWrite = 0;
    xhr.upload.onprogress = (event) => {
      if (cancelled.current || !event.lengthComputable || event.total === 0) return;
      const now = performance.now();
      if (now - lastWrite < STORE_INTERVAL_MS) return;
      lastWrite = now;
      const percent = Math.min(
        UPLOAD_CEILING,
        Math.round((event.loaded / event.total) * UPLOAD_CEILING)
      );
      for (const item of items) patchFile(item.id, { progress: percent });
    };

    xhr.onload = () => {
      running.current = false;
      request.current = null;
      if (cancelled.current) return;

      if (xhr.status < 200 || xhr.status >= 300) {
        const body = xhr.response as { error?: { message?: string } } | null;
        const message = body?.error?.message ?? messageFor('E009');
        logConversionError(toConversionError(new Error(message)), {
          stage: 'http',
          status: xhr.status,
        });
        failAll('E009', message);
        toast.error('Batch failed', { description: message });
        return;
      }

      const body = xhr.response as ConvertResponse | null;
      if (!body || !Array.isArray(body.results)) {
        failAll('E009', messageFor('E009'));
        toast.error('Batch failed', { description: messageFor('E009') });
        return;
      }

      void (async () => {
        const results = await Promise.all(
          body.results.map(async (entry, index) => {
            const source = items.find((item) => item.file.name === entry.originalName);
            const blob = await dataUrlToBlob(entry.dataUrl);
            return {
              id: source?.id ?? `result-${index}`,
              pair: { source: sourceFormat, target: targetFormat },
              originalName: entry.originalName,
              outputName: entry.filename,
              sourceSize: source?.file.size ?? entry.size,
              outputSize: entry.size,
              outputMimeType: entry.mimeType,
              engine: engineKindFor(entry.engine),
              engineName: entry.engine as EngineName,
              local: false,
              blob,
              outputUrl: URL.createObjectURL(blob),
              durationMs: body.summary.totalDurationMs,
            };
          })
        );

        if (cancelled.current) {
          for (const result of results) URL.revokeObjectURL(result.outputUrl);
          return;
        }

        const failures: ConversionFailure[] = body.failures.map((entry, index) => {
          const source = items.find((item) => item.file.name === entry.originalName);
          return {
            id: source?.id ?? `failure-${index}`,
            pair: { source: sourceFormat, target: targetFormat },
            originalName: entry.originalName,
            code: entry.code,
            // E004 is read from the client's copy rather than the server's. The
            // server's E004 is a template with a `{format}` token that is only
            // substituted when the throw site passes the variable, and several
            // do not — so the raw token, braces and all, is what arrives here
            // and what the user would read. `ERROR_MESSAGES.E004` in
            // lib/constants/messages.ts is placeholder-free by design. Every
            // other code keeps the server's wording, which is where the
            // specificity worth showing lives.
            message: entry.code === 'E004' ? errorMessage('E004') : entry.message,
            detail: entry.message,
          };
        });

        const summary: ConversionSummary = {
          total: body.summary.total,
          succeeded: body.summary.succeeded,
          failed: body.summary.failed,
          totalInputBytes: items.reduce((sum, item) => sum + item.file.size, 0),
          totalOutputBytes: results.reduce((sum, result) => sum + result.outputSize, 0),
          durationMs: body.summary.totalDurationMs,
        };

        finishBatch(results, failures, summary);
        setCompleted(items.length);

        if (failures.length === 0) {
          toast.success(`Converted ${results.length} file${results.length === 1 ? '' : 's'}`, {
            description: 'Download them from the results page.',
          });
        } else if (results.length > 0) {
          toast.warning(`${results.length} of ${items.length} converted`, {
            description: `${failures.length} file${failures.length === 1 ? '' : 's'} failed.`,
          });
        } else {
          toast.error('Nothing converted', {
            description: failures[0]?.message ?? messageFor('E009'),
          });
        }

        setTimeout(() => {
          if (!cancelled.current) router.push('/result');
        }, SETTLE_MS);
      })();
    };

    xhr.onerror = () => {
      running.current = false;
      request.current = null;
      if (cancelled.current) return;
      failAll('E009', messageFor('E009'));
      toast.error('Batch failed', { description: messageFor('E009') });
    };

    xhr.onabort = () => {
      running.current = false;
      request.current = null;
    };

    xhr.send(form);
  }, [startBatch, patchFile, finishBatch, router]);

  const cancel = React.useCallback(() => {
    cancelled.current = true;
    running.current = false;
    request.current?.abort();
  }, []);

  const overallPercent = React.useMemo(() => {
    if (files.length === 0) return 0;
    const sum = files.reduce((total, item) => total + item.progress, 0);
    return Math.round(sum / files.length);
  }, [files]);

  return {
    isConverting,
    completed,
    total: files.length,
    overallPercent,
    canStart,
    start,
    goToResults,
    cancel,
  };
}
