/**
 * components/camerlob/ResultCard.tsx
 * One converted file: preview, before → after names, size delta, two actions.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE PREVIEW IS THE CONVERTED BYTES, AT 4:3 WITH OBJECT-CONTAIN. A 4:3 frame
 *    for arbitrary aspect ratios would letterbox a panorama and crop a portrait if
 *    it were `cover`. `contain` on a near-black inset means every image is fully
 *    visible and the frame is consistent, which is what makes a grid of them read
 *    as a set.
 *
 * 2. A FAILED DECODE FALLS BACK TO THE FORMAT BADGE, NOT A BROKEN IMAGE. The
 *    result page legitimately holds files the browser cannot render — the
 *    placeholder hands back the source payload under the target MIME type, and a
 *    real RAW or PSD conversion lands the same way before the engine is wired.
 *    A broken-image glyph in a grid of successes reads as a bug in the product.
 *    The badge shows the target extension, so the card still communicates what it
 *    produced.
 *
 * 3. THE SIZE DELTA IS COLOURED BY DIRECTION AND ARROWED. Aqua-green with a down
 *    arrow when smaller, amber with an up arrow when larger, muted with a dash
 *    when unchanged. Under the current placeholder the honest value is "unchanged",
 *    and that branch is styled as a first-class state rather than as missing data.
 *
 * 4. THE EXTENSION IS THE AQUA PART OF THE FILENAME. Rendering the stem muted and
 *    the extension in aqua is how the page answers "what did I just get" at a
 *    glance, without a second line of copy.
 *
 * 5. "COPIED" IS A TOOLTIP THAT REPLACES THE ICON'S LABEL, NOT A FLOATING
 *    OVERLAY. An absolutely-positioned bubble over a 3-column grid overlaps its
 *    neighbours and clips at the card edge. Rendering the confirmation in place
 *    next to the icon is legible, never clipped, and still announced.
 *
 * 6. THE HOVER LIFT AND THUMBNAIL ZOOM ARE SEPARATE TRANSFORMS ON SEPARATE
 *    ELEMENTS. Putting both on one node would have them overwrite each other.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, Copy, Download, Minus } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

import { formatBytes } from '@/lib/utils/file-size';
import { downloadBlob } from '@/lib/utils/download';
import { ENGINE_LABELS } from '@/lib/constants/errors';
import { cn } from '@/lib/utils/cn';
import type { FileConversionResult } from '@/store/conversionStore';

const OUT = [0.16, 1, 0.3, 1] as const;

function splitName(name: string): { stem: string; extension: string } {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return { stem: name, extension: '' };
  return { stem: name.slice(0, dot), extension: name.slice(dot) };
}

export interface ResultCardProps {
  result: FileConversionResult;
  index: number;
}

export function ResultCard({ result, index }: ResultCardProps) {
  const reduceMotion = useReducedMotion();
  const [previewBroken, setPreviewBroken] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const target = splitName(result.outputName);
  const delta = result.outputSize - result.sourceSize;
  const smaller = delta < 0;
  const larger = delta > 0;
  const DeltaIcon = smaller ? ArrowDown : larger ? ArrowUp : Minus;

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(result.outputName);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard permission denied or an insecure context. There is no honest
      // fallback that is not a worse experience, so the button simply does not
      // confirm rather than claiming success.
      setCopied(false);
    }
  };

  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.4,
        ease: OUT,
        delay: reduceMotion ? 0 : Math.min(index, 10) * 0.06,
      }}
      // `min-w-0` so the card can shrink inside its grid track at the 340px
      // floor. Without it the intrinsic min-width of the unbreakable filename
      // row below wins, and the page grows a horizontal scrollbar.
      className={cn(
        'group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary',
        'transition-[border-color,box-shadow,transform] duration-200 ease-camerlob-out',
        'hover:-translate-y-0.5 hover:border-aqua-500/40 hover:shadow-card-hover',
        'focus-within:border-aqua-500/40'
      )}
    >
      {/* 4:3 preview frame. */}
      <div className="relative aspect-[4/3] overflow-hidden border-b border-border-subtle bg-bg-primary">
        {previewBroken ? (
          <span className="absolute inset-0 grid place-items-center font-mono text-xs uppercase tracking-[0.08em] text-text-disabled">
            {target.extension.replace('.', '') || 'FILE'}
          </span>
        ) : (
          <Image
            src={result.outputUrl}
            alt={`Preview of ${result.outputName}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            /* Blob URLs are not optimisable — see FileCard.tsx. `unoptimized`
               still gets this through next/image with correct layout and
               intrinsic sizing, and the parent's `aspect-[4/3]` + object-contain
               does the fitting. */
            unoptimized
            onError={() => setPreviewBroken(true)}
            className="object-contain transition-transform duration-300 ease-camerlob-out group-hover:scale-[1.02]"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <p className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
          <span className="truncate text-text-tertiary" title={result.originalName}>
            {result.originalName}
          </span>
          <span aria-hidden="true" className="shrink-0 text-aqua-500">
            →
          </span>
          <span className="truncate text-text-primary" title={result.outputName}>
            {target.stem}
            <span className="text-aqua-400">{target.extension}</span>
          </span>
        </p>

        <p className="flex items-center gap-1.5 font-mono text-xs text-text-tertiary">
          <span>{formatBytes(result.sourceSize)}</span>
          <span aria-hidden="true">→</span>
          <span className={cn(smaller && 'text-success', larger && 'text-warning')}>
            {formatBytes(result.outputSize)}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-0.5',
              smaller ? 'text-success' : larger ? 'text-warning' : 'text-text-disabled'
            )}
          >
            <DeltaIcon aria-hidden="true" className="size-3" strokeWidth={2} />
            {smaller
              ? `${Math.round((Math.abs(delta) / result.sourceSize) * 100)}%`
              : larger
                ? `${Math.round((Math.abs(delta) / result.sourceSize) * 100)}%`
                : 'same'}
          </span>
          <span
            className="ml-auto inline-flex items-center rounded-full border border-border-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary"
            title={`Converted with ${result.engineName}`}
          >
            {ENGINE_LABELS[result.engineName] ?? result.engineName}
          </span>
        </p>

        <div className="mt-auto flex items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => downloadBlob(result.blob, result.outputName)}
            aria-label={`Download ${result.outputName}`}
            className={cn(
              'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-aqua-500/40 font-mono text-[11px] uppercase tracking-[0.08em] text-aqua-400',
              'transition-colors duration-150 ease-camerlob-out',
              'enabled:hover:border-aqua-500/70 enabled:hover:bg-aqua-500/10',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
            )}
          >
            <Download aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            Download
          </button>

          <button
            type="button"
            onClick={copyName}
            aria-label={
              copied ? `${result.outputName} copied` : `Copy the name ${result.outputName}`
            }
            className={cn(
              'inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 font-mono text-[11px] uppercase tracking-[0.08em]',
              'transition-colors duration-150 ease-camerlob-out',
              copied ? 'text-success' : 'text-text-tertiary enabled:hover:text-aqua-400',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
            )}
          >
            {copied ? (
              <Check aria-hidden="true" className="size-3.5" strokeWidth={2} />
            ) : (
              <Copy aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </motion.li>
  );
}
