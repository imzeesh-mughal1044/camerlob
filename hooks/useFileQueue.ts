/**
 * hooks/useFileQueue.ts
 * Client-side validation, detection and enqueueing for the upload zone.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE 20-FILE LIMIT IS A HARD BLOCK, NOT A TRUNCATION. A 25-file drop adds
 *    the first 20 and rejects the other 5 with a toast naming the count. Silently
 *    taking the first 20 would leave the user believing 25 files were queued;
 *    silently taking the last 20 would discard the ones they picked first.
 *
 * 2. REJECTIONS ARE REPORTED ONCE, GROUPED BY REASON. Dropping 30 wrong-format
 *    files must not fire 30 toasts. One toast per reason, with the offending
 *    filenames folded into the description, is the only readable outcome.
 *
 * 3. VALIDATION HAPPENS ONCE, IN ONE PLACE. react-dropzone accepts everything,
 *    because its own `onDropRejected` path rejects a mixed drop wholesale and
 *    would lose the good files along with the bad.
 *
 * 4. DETECTION IS ASYNC, SO `addFiles` IS ASYNC. The first bytes of every drop
 *    are read to identify the real format before it is queued. react-dropzone is
 *    happy with a promise-returning handler, and the alternative — trusting the
 *    extension and letting the route reject the file with E010 after a full
 *    upload — spends the user's bandwidth to learn something the browser could
 *    read for free.
 *
 * 5. THE SERVER'S 50MB CEILING GOVERNS, NOT THE CLIENT'S 100MB. Since every
 *    conversion now runs through `POST /api/convert` (the route refuses
 *    `clientSide`), a file larger than 50MB is guaranteed to be rejected by the
 *    server. Enforcing the client's more permissive 100MB here would let a 60MB
 *    file be queued, uploaded, and then refused — the exact fail-late behaviour
 *    the hard-block rule exists to prevent. The gate and the label both use the
 *    server figure so the user is told the number that is actually enforced.
 *
 * 6. AUTO MODE IS HOMOGENEOUS, AND ITS SOURCE COMES FROM BYTES. The first file
 *    whose magic bytes resolve sets the source; every later file must be
 *    equivalent to it, or it is rejected with E010. A batch with a mixed source
 *    cannot be sent as one multipart request, which carries one `sourceFormat`.
 */

'use client';

import * as React from 'react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { messageFor } from '@/lib/constants/errors';
import { FORMAT_REGISTRY, SOURCE_FORMATS } from '@/lib/constants/formats';
import { MAX_FILES, SERVER_MAX_FILE_SIZE_MB } from '@/lib/constants/limits';
import {
  AUTO_ACCEPT_ATTRIBUTE,
  formatsEquivalent,
  getAcceptAttribute,
} from '@/lib/convert/formats';
import { detectFormatFromFile } from '@/lib/utils/detect-client-format';
import { megabytesToBytes } from '@/lib/utils/file-size';
import { useConversionStore } from '@/store/conversionStore';
import type { FileQueueItem } from '@/store/conversionStore';
import type { ConversionMode } from '@/store/conversionStore';

const MAX_BYTES = megabytesToBytes(SERVER_MAX_FILE_SIZE_MB);

/** Every extension the detector can resolve, for the Auto-mode gate. */
const AUTO_EXTENSIONS: ReadonlySet<string> = new Set(
  SOURCE_FORMATS.flatMap((id) => FORMAT_REGISTRY[id]?.extensions ?? [])
);

export type QueueRejectionCode = 'E002' | 'E003' | 'E004' | 'E010';

export interface QueueRejection {
  readonly code: QueueRejectionCode;
  readonly names: readonly string[];
}

export interface FileQueue {
  readonly count: number;
  readonly totalBytes: number;
  readonly isFull: boolean;
  /** The active mode, so a caller can phrase its own hint without re-reading the store. */
  readonly mode: ConversionMode;
  /** False when a manual source and target are not both chosen, or the batch is full. */
  readonly canAccept: boolean;
  /** Extensions shown in the drop zone's "expecting" note. */
  readonly acceptedExtensions: readonly string[];
  /** Value for the file input's `accept`, mode-aware. */
  readonly accept: string;
  addFiles: (incoming: File[]) => Promise<QueueRejection[]>;
  removeFile: (id: string) => void;
  clearAll: () => void;
}

/** Up to three names, then a count, so a 30-file drop does not produce a paragraph. */
function listNames(names: readonly string[], cap = 3): string {
  const shown = names.slice(0, cap).join(', ');
  return names.length <= cap ? shown : `${shown} +${names.length - cap} more`;
}

/** Lower-case extension including the dot, or `''` when the name has none. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

export function useFileQueue(): FileQueue {
  const mode = useConversionStore((state) => state.mode);
  const sourceFormat = useConversionStore((state) => state.sourceFormat);
  const targetFormat = useConversionStore((state) => state.targetFormat);
  const files = useConversionStore((state) => state.files);
  const setSource = useConversionStore((state) => state.setSource);
  const addFile = useConversionStore((state) => state.addFile);
  const removeFile = useConversionStore((state) => state.removeFile);
  const clearFiles = useConversionStore((state) => state.clearFiles);

  const isFull = files.length >= MAX_FILES;

  // In Auto mode the zone is open before any format is chosen — that is the
  // whole point: the first file chooses the source. In Manual mode it waits for
  // the full pair, because a file with no target has nowhere to go.
  const canAccept = mode === 'auto' ? !isFull : Boolean(sourceFormat && targetFormat) && !isFull;

  const acceptedExtensions = React.useMemo(
    () =>
      mode === 'manual' && sourceFormat
        ? (FORMAT_REGISTRY[sourceFormat]?.extensions ?? [])
        : [...AUTO_EXTENSIONS],
    [mode, sourceFormat]
  );

  // Memoised on exactly the two inputs that decide it, so the file dialog is
  // always opened with the accept list for the *current* mode and source. The
  // OS picker reads this attribute off the DOM at the moment the user clicks,
  // which is why it cannot be derived at click time: by then the value the input
  // was last rendered with is all the browser has. Dotted extensions only — see
  // `getAcceptAttribute`.
  const accept = React.useMemo(
    () =>
      mode === 'manual' && sourceFormat ? getAcceptAttribute(sourceFormat) : AUTO_ACCEPT_ATTRIBUTE,
    [mode, sourceFormat]
  );

  const addFiles = useCallback(
    async (incoming: File[]): Promise<QueueRejection[]> => {
      if (incoming.length === 0) return [];

      const rejections: QueueRejection[] = [];
      const push = (code: QueueRejectionCode, group: File[]) => {
        if (group.length > 0) rejections.push({ code, names: group.map((file) => file.name) });
      };

      const oversized: File[] = [];
      const wrongFormat: File[] = [];
      const mismatched: File[] = [];
      const accepted: { file: File; detectedFormat: string }[] = [];

      // In Manual mode the allowed set is the chosen source's extensions; in
      // Auto mode it is every extension the detector can resolve. A Set here
      // keeps the per-file check O(1) rather than a scan of forty entries.
      const allowedExtensions = mode === 'auto' ? AUTO_EXTENSIONS : new Set(acceptedExtensions);

      // The source is read once at entry. In Auto mode it may still be filled in
      // by the first accepted file below; capturing it here keeps the loop from
      // seeing a half-updated value.
      let currentSource = sourceFormat;

      for (const file of incoming) {
        if (file.size > MAX_BYTES) {
          oversized.push(file);
          continue;
        }

        const extension = extensionOf(file.name);
        // A file with no extension is let through: the OS may not have given us
        // one, and detection below is the real gate.
        if (extension && !allowedExtensions.has(extension)) {
          wrongFormat.push(file);
          continue;
        }

        const { format } = await detectFormatFromFile(file);

        if (!format) {
          // The bytes are unreadable or unrecognised. Accepting the file would
          // only move the failure to the server, after an upload.
          mismatched.push(file);
          continue;
        }

        if (currentSource === null) {
          if (mode !== 'auto') {
            // Manual mode always has a source, so this branch is unreachable in
            // practice; rejecting rather than guessing keeps the invariant true.
            mismatched.push(file);
            continue;
          }
          currentSource = format;
        } else if (!formatsEquivalent(format, currentSource)) {
          mismatched.push(file);
          continue;
        }

        accepted.push({ file, detectedFormat: format });
      }

      const room = Math.max(0, MAX_FILES - files.length);
      const overflow = accepted.length > room ? accepted.slice(room) : [];
      const admitted = accepted.slice(0, room);

      // The source, if the first file settled it, is committed before any file
      // is enqueued: the store stamps each job with the pair as it is added, so
      // setting it after would leave the first file with an empty source.
      if (mode === 'auto' && sourceFormat === null && admitted.length > 0) {
        setSource(admitted[0]!.detectedFormat);
      }

      for (const entry of admitted) {
        addFile({ file: entry.file, detectedFormat: entry.detectedFormat });
      }

      if (oversized.length > 0) {
        const names = oversized.map((file) => file.name);
        toast.error('File too large', {
          description: `${listNames(names)} ${
            names.length > 1 ? 'are' : 'is'
          } over the ${SERVER_MAX_FILE_SIZE_MB}MB per-file limit.`,
        });
      }

      if (wrongFormat.length > 0) {
        const names = wrongFormat.map((file) => file.name);
        const label =
          mode === 'manual' && sourceFormat
            ? (FORMAT_REGISTRY[sourceFormat]?.label ?? sourceFormat.toUpperCase())
            : 'a supported image';
        toast.error('Unsupported format', {
          description: `${listNames(names)} ${names.length > 1 ? 'are not' : 'is not'} ${label}.`,
        });
      }

      if (mismatched.length > 0) {
        const names = mismatched.map((file) => file.name);
        const label =
          mode === 'manual' && sourceFormat
            ? (FORMAT_REGISTRY[sourceFormat]?.label ?? sourceFormat.toUpperCase())
            : 'the source format';
        toast.error('Format mismatch', {
          description: `${listNames(names)} ${
            names.length > 1 ? 'do not' : 'does not'
          } match ${label}. Add files of one format at a time.`,
        });
      }

      if (overflow.length > 0) {
        const names = overflow.map((entry) => entry.file.name);
        toast.error('Batch is full', {
          description: `${messageFor('E003', { max: String(MAX_FILES) })} Skipped ${listNames(names)}.`,
        });
      }

      if (admitted.length > 0) {
        const targetLabel = targetFormat
          ? (FORMAT_REGISTRY[targetFormat]?.label ?? targetFormat.toUpperCase())
          : null;
        toast.success(admitted.length === 1 ? 'File added' : `${admitted.length} files added`, {
          description: targetLabel
            ? `Ready to convert to ${targetLabel}.`
            : 'Pick a target format to continue.',
        });
      }

      push('E002', oversized);
      push('E004', wrongFormat);
      push('E010', mismatched);
      push(
        'E003',
        overflow.map((entry) => entry.file)
      );

      return rejections;
    },
    [mode, sourceFormat, targetFormat, files.length, acceptedExtensions, setSource, addFile]
  );

  const remove = useCallback((id: string) => removeFile(id), [removeFile]);
  const clearAll = useCallback(() => clearFiles(), [clearFiles]);

  return {
    count: files.length,
    totalBytes: files.reduce((sum, job: FileQueueItem) => sum + job.file.size, 0),
    isFull,
    mode,
    canAccept,
    acceptedExtensions,
    accept,
    addFiles,
    removeFile: remove,
    clearAll,
  };
}
