/**
 * components/camerlob/FileCounter.tsx
 * "7 / 20 files", in mono, in aqua.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE NUMBERS FADE ON CHANGE, THE LABEL DOES NOT. The value is the part that
 *    moves; fading the whole string would make "/ 20 files" strobe on every
 *    keystroke of a batch. So each side fades independently and the suffix sits
 *    still, which makes the delta readable at a glance.
 *
 * 2. `aria-live="polite"` ON THE VALUE ONLY. Announcing "7 / 20 files" on every
 *    add is the right amount of information; announcing the surrounding toolbar
 *    buttons with it would make a batch add sound like a page change. The
 *    container is a `role="status"` so the region exists before the first update
 *    and screen readers have something to attach to.
 *
 * 3. IT TURNS AMBER AT 80% AND RED-ORANGE WHEN FULL. A hard limit the user cannot
 *    see coming is a hard limit they hit as a rejection. The colour shift is
 *    reinforcement, never the only signal — the denominator and the count are
 *    both always present as text.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface FileCounterProps {
  count: number;
  max: number;
  className?: string;
}

export function FileCounter({ count, max, className }: FileCounterProps) {
  const reduceMotion = useReducedMotion();
  const ratio = max === 0 ? 0 : count / max;
  const full = count >= max;
  const nearlyFull = !full && ratio >= 0.8;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex items-baseline gap-1.5 font-mono text-xs tabular-nums', className)}
    >
      <motion.span
        key={count}
        initial={reduceMotion ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'transition-colors duration-200 ease-camerlob-out',
          full ? 'text-error' : nearlyFull ? 'text-warning' : 'text-aqua-400'
        )}
      >
        {count}
      </motion.span>
      <span className="text-text-tertiary">/ {max} files</span>
    </p>
  );
}
