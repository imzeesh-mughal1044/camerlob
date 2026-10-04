/**
 * components/camerlob/UploadZone.tsx
 * Step 2 of the converter: the drop target.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. react-dropzone IS CONFIGURED TO ACCEPT EVERYTHING, AND VALIDATION IS OURS.
 *    Its `accept` and `maxSize` options reject a whole mixed drop at once, which
 *    would throw away the 18 good files because one was 120MB. Passing every file
 *    through to `useFileQueue` lets the good ones in and reports the bad ones by
 *    name, which is the behaviour the TRD's hard-block rule describes.
 *
 * 2. THE INPUT IS GIVEN A REAL ID SO "ADD MORE" CAN REACH IT. Rather than thread a
 *    ref from the page through FileQueue and back up into this component, the
 *    hidden input carries a single well-known id and the toolbar clicks it. One
 *    documented constant instead of three levels of plumbing.
 *
 * 3. THE ACCEPTANCE PULSE IS A RING, NOT A FLASH. The brief calls for a 150ms
 *    background flash; a full-bleed colour flash on a 240px-tall element is the
 *    single most seizure-adjacent thing a drop zone can do. An expanding 2px aqua
 *    ring carries the same "landed" signal, reads as deliberate rather than
 *    alarming, and is transform-only so it stays on the compositor.
 *
 * 4. THE DISABLED STATE IS A MESSAGE, NOT A BLANK BOX. Before formats are chosen
 *    the zone is still rendered, at low opacity, with "// PICK FORMATS FIRST".
 *    Hiding it would make the page reflow when formats are selected and would
 *    leave the user wondering where the uploader went.
 *
 * 5. BORDER-COLOUR AND BACKGROUND TRANSITION ON COLOUR ONLY. The drag-over state
 *    animates `border-color` and `background-color` at 200ms on the ease-in-out
 *    curve, per the brief. The icon's scale is a transform, so it does not
 *    invalidate that.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import * as React from 'react';
import { useDropzone } from 'react-dropzone';

import { FileCounter } from '@/components/camerlob/FileCounter';
import { MAX_FILES, SERVER_MAX_FILE_SIZE_MB } from '@/lib/constants/limits';
import { cn } from '@/lib/utils/cn';
import { useFileQueue } from '@/hooks/useFileQueue';

/** Shared with FileQueue's "Add more" control. See decision 2. */
export const FILE_INPUT_ID = 'camerlob-file-input';

const IN = [0.65, 0, 0.35, 1] as const;

export function UploadZone() {
  const reduceMotion = useReducedMotion();
  const queue = useFileQueue();
  const [pulseKey, setPulseKey] = React.useState(0);

  // The zone is its own gate: `canAccept` already folds in the mode (Auto is
  // open before a format is chosen), the manual source requirement and the
  // 20-file ceiling, so the page cannot enable it into an invalid state.
  const enabled = queue.canAccept;

  const onDrop = React.useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setPulseKey((key) => key + 1);
      void queue.addFiles(files);
    },
    [queue]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive: dropzoneActive,
  } = useDropzone({
    onDrop,
    multiple: true,
    // No accept and no maxSize on purpose — see decision 1.
    disabled: !enabled,
    noClick: false,
    noKeyboard: false,
  });

  const dragging = dropzoneActive;

  return (
    <div className="w-full">
      <div
        {...getRootProps({
          className: cn(
            'group relative isolate flex min-h-[200px] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl px-6 py-8 text-center md:min-h-[240px]',
            'border-2 border-dashed transition-[border-color,background-color] duration-200 ease-camerlob-in-out',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400',
            enabled
              ? [
                  'cursor-pointer border-aqua-500/60 bg-bg-secondary',
                  dragging && 'border-solid border-aqua-400 bg-aqua-500/[0.06] shadow-glow-md',
                ]
              : 'cursor-not-allowed border-border-muted bg-bg-secondary/40 opacity-60'
          ),
          // The root is a div; without an explicit role and state a screen reader
          // announces nothing actionable about this large target.
          role: 'button',
          'aria-label': enabled
            ? queue.mode === 'auto'
              ? 'Drop supported image files here, or press Enter to browse. The first file sets the source format.'
              : `Drop ${queue.acceptedExtensions.slice(0, 3).join(', ')} files here, or press Enter to browse`
            : queue.isFull
              ? 'The batch is full. Remove a file before adding more.'
              : 'Upload unavailable until a source and target are chosen',
          'aria-disabled': !enabled,
        })}
      >
        <input {...getInputProps({ id: FILE_INPUT_ID, accept: queue.accept })} />

        {/* Decision 3: the acceptance ring. Transform-only, one shot per drop. */}
        {pulseKey > 0 ? (
          <motion.span
            key={pulseKey}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl border-2 border-aqua-400"
            initial={reduceMotion ? false : { opacity: 0.6, scale: 0.97 }}
            animate={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : null}

        {enabled ? (
          <>
            <motion.span
              className="grid place-items-center text-aqua-400"
              animate={reduceMotion || !dragging ? undefined : { scale: 1.1 }}
              transition={{ duration: 0.2, ease: IN }}
            >
              <UploadCloud aria-hidden="true" className="size-12" strokeWidth={1.25} />
            </motion.span>

            <p className="text-lg font-semibold text-text-primary">
              {dragging ? 'Release to add' : 'Drop your files here'}
            </p>
            <p className="text-sm text-text-secondary">{dragging ? '' : 'or click to browse'}</p>
            <p className="mono-note mt-1">
              {`${MAX_FILES} files max · ${SERVER_MAX_FILE_SIZE_MB}MB each`}
            </p>
          </>
        ) : (
          <>
            <UploadCloud
              aria-hidden="true"
              className="size-10 text-text-disabled"
              strokeWidth={1.25}
            />
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-text-tertiary">
              {queue.isFull ? '// Batch is full' : '// Pick formats first'}
            </p>
          </>
        )}
      </div>

      {enabled ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <FileCounter count={queue.count} max={MAX_FILES} />
          <p className="mono-note truncate">
            {queue.mode === 'auto' ? (
              <>{'// any supported format'}</>
            ) : queue.acceptedExtensions.length > 0 ? (
              <>
                {'// expecting '}
                <span className="text-aqua-400">{queue.acceptedExtensions.join(' ')}</span>
              </>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
