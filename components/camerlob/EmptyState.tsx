/**
 * components/camerlob/EmptyState.tsx
 * What /result shows when there is nothing to show.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. IT IS A SIBLING OF THE HEADER, NOT A REPLACEMENT FOR THE PAGE. The user
 *    navigated here deliberately, so the page keeps its eyebrow, its identity and
 *    its footer. Swapping the entire route for a centred card would make "no
 *    results" feel like a different product.
 *
 * 2. THE APERTURE IS DRAWN, NOT AN ICON. A faded 160px iris built from the same
 *    six-blade geometry as the landing hero's visual, at 10% opacity, says "this
 *    is the same tool, idle" in a way a lucide `ImageOff` never does. It is
 *    `aria-hidden` and completely static — an empty state is the one place where
 *    movement would be actively annoying.
 *
 * 3. ONE CALL TO ACTION, NOT TWO. "Convert files" is the only useful thing to do
 *    here. A second link to the docs would be a way out of a dead end that this
 *    dead end does not have.
 *
 * 4. `min-h-[60vh]` SO THE FOOTER SITS BELOW THE FOLD ON A TALL PAGE. A short
 *    empty state would let the footer ride up into the middle of the viewport and
 *    make the page look like it had loaded content.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import * as React from 'react';

import { buttonClasses, buttonMotion } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const BLADES = 6;
const RADIUS = 68;

/** One blade: a chord of the iris, drawn as a filled wedge. */
function bladePath(index: number): string {
  const start = (index / BLADES) * Math.PI * 2;
  const end = start + Math.PI / BLADES;
  const mid = (start + end) / 2;
  const x1 = 50 + RADIUS * Math.cos(start);
  const y1 = 50 + RADIUS * Math.sin(start);
  const x2 = 50 + RADIUS * Math.cos(end);
  const y2 = 50 + RADIUS * Math.sin(end);
  const x3 = 50 + RADIUS * 0.34 * Math.cos(mid);
  const y3 = 50 + RADIUS * 0.34 * Math.sin(mid);
  return `M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z L ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
}

export interface EmptyStateProps {
  className?: string;
}

export function EmptyState({ className }: EmptyStateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center',
        className
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="size-40 text-aqua-400 opacity-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
      >
        <circle cx="50" cy="50" r={RADIUS} />
        {Array.from({ length: BLADES }, (_, index) => (
          <path key={index} d={bladePath(index)} />
        ))}
      </svg>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-3"
      >
        <h2 className="font-serif text-[2.5rem] leading-tight text-text-primary">
          Nothing to see here.
        </h2>
        <p className="measure-prose text-base text-text-secondary">
          You haven&apos;t converted anything yet. Start with a batch.
        </p>
        {/* `next/link`, not <a>: the store is in-memory only, so a full page load
            would throw away the session. The press choreography lives on an inner
            span because framer props on a Link would reach the DOM as unknown
            attributes and warn. */}
        <Link
          href="/convert"
          className={cn(buttonClasses({ variant: 'primary', size: 'md' }), 'mt-2')}
        >
          <motion.span className="inline-flex items-center gap-2" {...buttonMotion}>
            Convert files
            <span aria-hidden="true">→</span>
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
}
