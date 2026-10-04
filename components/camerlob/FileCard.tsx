/**
 * components/camerlob/FileCard.tsx
 * One row in the upload queue: thumbnail, name, size, status, remove.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE PROGRESS BAR IS `scaleX` ON A FULL-WIDTH FILL. The brief describes a
 *    width transition, which would relayout the card on every frame. A fill that
 *    is always 100% wide and scaled from the left is visually identical and
 *    compositor-only. The parent clips it with `overflow-hidden`, so the scale
 *    never spills past the card's radius.
 *
 * 2. REMOVING A CARD DOES NOT ANIMATE ITS HEIGHT. The brief asks for a collapse
 *    to height 0 over 200ms; animating height is a layout animation on every
 *    frame and is forbidden by the build's own motion rule. Instead the card
 *    leaves with opacity + translateY, and the *surviving* cards slide up into the
 *    gap via `layout`, which is a transform. The result reads as a collapse
 *    because nothing else on screen moves at the same time.
 *
 * 3. THE STATUS PILL IS A `role="status"` ELEMENT WITH ITS OWN TEXT. "Converting"
 *    is also conveyed by the progress bar, but a bar is invisible to a screen
 *    reader, so the pill carries the state in words rather than relying on colour
 *    or geometry.
 *
 * 4. THE THUMBNAIL DEGRADES TO A FORMAT BADGE. The queue can legitimately hold a
 *    file the browser cannot decode — a CR2, a PSD — and an <img> pointed at one
 *    renders a broken-image glyph. `onError` swaps in the uppercase extension so
 *    the row never looks broken, and the filename beside it still identifies the
 *    file. (The same guard is on ResultCard.)
 *
 * 5. THE REMOVE BUTTON TURNS RED-ORANGE ON HOVER, NOT JUST ON FOCUS. Removal is
 *    destructive and the affordance should be as obvious for a mouse user as the
 *    focus ring is for a keyboard user.
 *
 * 6. THE FILENAME TRUNCATES WITH AN ELLIPSIS AND CARRIES THE FULL NAME IN `title`.
 *    Long filenames are normal on camera cards; a wrapped two-line row would make
 *    the queue jump around as files are added.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { RotateCw, X } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

import { formatBytes } from '@/lib/utils/file-size';
import { cn } from '@/lib/utils/cn';
import { getFormatMeta } from '@/lib/constants/formats';
import type { FileQueueItem } from '@/store/conversionStore';

const OUT = [0.16, 1, 0.3, 1] as const;

type PillTone = 'queued' | 'converting' | 'done' | 'failed';

const PILL: Record<PillTone, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'border-border-muted text-text-tertiary' },
  converting: { label: 'Converting', className: 'border-aqua-500/50 text-aqua-300' },
  done: { label: 'Done', className: 'border-success/40 text-success' },
  failed: { label: 'Failed', className: 'border-error/50 text-error' },
};

function toneFor(job: FileQueueItem): PillTone {
  if (job.status === 'done') return 'done';
  if (job.status === 'failed') return 'failed';
  if (job.status === 'converting') return 'converting';
  return 'queued';
}

/** Human label for a format id, falling back to the uppercase id. */
function formatLabel(id: string): string {
  return getFormatMeta(id)?.label ?? id.toUpperCase();
}

/** Signed byte delta between output and input, or `null` when there is none. */
function delta(job: FileQueueItem): string | null {
  if (!job.result) return null;
  const diff = job.result.outputSize - job.result.sourceSize;
  if (diff === 0) return null;
  const percent = job.result.sourceSize > 0 ? Math.round((diff / job.result.sourceSize) * 100) : 0;
  return `${diff > 0 ? '+' : '−'}${formatBytes(Math.abs(diff))} (${percent > 0 ? '+' : ''}${percent}%)`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : 'FILE';
}

export interface FileCardProps {
  job: FileQueueItem;
  /** Position in the queue, for the 40ms entry stagger. */
  index: number;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

export function FileCard({ job, index, onRemove, onRetry }: FileCardProps) {
  const reduceMotion = useReducedMotion();
  const [thumbBroken, setThumbBroken] = React.useState(false);
  const tone = toneFor(job);
  const pill = PILL[tone];
  const showProgress = job.status === 'converting' || job.status === 'done';
  const sizeDelta = delta(job);

  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
      transition={{
        duration: reduceMotion ? 0 : 0.3,
        ease: OUT,
        delay: reduceMotion ? 0 : Math.min(index, 12) * 0.04,
      }}
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden rounded-md border bg-bg-secondary p-3',
        'transition-[border-color,box-shadow,transform] duration-200 ease-camerlob-out',
        'hover:-translate-y-px hover:border-border-muted hover:shadow-md',
        tone === 'converting' && 'border-aqua-500/60 shadow-glow-sm',
        tone === 'done' && 'border-success/40',
        tone === 'failed' && 'border-error/60'
      )}
    >
      {/* Thumbnail, 44px on mobile and 56px from md up. */}
      <span
        aria-hidden="true"
        className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-sm border border-border-subtle bg-bg-primary md:size-14"
      >
        {job.thumbnailUrl && !thumbBroken ? (
          <Image
            src={job.thumbnailUrl}
            alt=""
            fill
            sizes="56px"
            /* Blob URLs cannot go through the optimiser — it would try to fetch
               them over HTTP. `unoptimized` renders the source directly, so this
               is still next/image (and still gets its width/height, decoding and
               lazy-loading) without the round trip. */
            unoptimized
            onError={() => setThumbBroken(true)}
            className="object-cover"
          />
        ) : (
          <span className="font-mono text-[10px] tracking-[0.08em] text-text-tertiary">
            {extensionOf(job.file.name).slice(0, 4)}
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-mono text-sm text-text-primary" title={job.file.name}>
          {job.file.name}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-xs text-text-tertiary">{formatBytes(job.file.size)}</span>
          {job.result ? (
            <span className="font-mono text-xs text-text-tertiary" aria-label="Output size">
              {'→ '}
              {formatBytes(job.result.outputSize)}
            </span>
          ) : null}
          {sizeDelta ? (
            <span className="font-mono text-xs text-text-tertiary">{sizeDelta}</span>
          ) : null}
          {job.detectedFormat ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-aqua-400/80">
              {formatLabel(job.detectedFormat)}
            </span>
          ) : null}
          <span
            role="status"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]',
              pill.className
            )}
          >
            {tone === 'converting' ? (
              <motion.span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-aqua-300"
                animate={reduceMotion ? undefined : { opacity: [1, 0.25, 1], scale: [1, 0.7, 1] }}
                transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
              />
            ) : null}
            {pill.label}
          </span>
        </span>
        {job.error ? (
          <span className="truncate font-mono text-[11px] text-error" title={job.error.message}>
            {job.error.code}
            {' · '}
            {job.error.message}
          </span>
        ) : null}
      </span>

      {tone === 'failed' && onRetry ? (
        <button
          type="button"
          onClick={() => onRetry(job.id)}
          aria-label={`Retry converting ${job.file.name}`}
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-aqua-400',
            'transition-colors duration-150 ease-camerlob-out',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400 enabled:hover:bg-aqua-500/10'
          )}
        >
          <RotateCw aria-hidden="true" className="size-3" strokeWidth={1.75} />
          Retry
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onRemove(job.id)}
        aria-label={`Remove ${job.file.name} from the queue`}
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-md text-text-tertiary',
          'transition-colors duration-150 ease-camerlob-out',
          'enabled:hover:bg-error/15 enabled:hover:text-error',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
        )}
      >
        <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </button>

      {/* Decision 1: a full-width fill scaled from the left. */}
      {showProgress ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-border-subtle"
        >
          <motion.span
            className="block h-full w-full origin-left bg-gradient-to-r from-aqua-600 via-aqua-400 to-aqua-200"
            initial={false}
            animate={{ scaleX: job.progress / 100 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: OUT }}
          />
        </span>
      ) : null}
    </motion.li>
  );
}
