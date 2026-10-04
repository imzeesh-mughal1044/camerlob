/**
 * components/camerlob/ResultGrid.tsx
 * The responsive grid of successful conversions.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THREE / TWO / ONE COLUMNS AT THE THREE BREAKPOINTS, NOT `auto-fill`.
 *    `repeat(auto-fill, minmax(280px, 1fr))` — the brief's suggestion — produces
 *    four columns at 1440px inside a max-width container, which makes each card
 *    320px wide and the 4:3 preview 240px tall: a wall of near-identical
 *    rectangles with no clear reading order. Explicit columns give one card per
 *    row on a phone, a scannable pair on a tablet, and three comfortably wide
 *    cards on a desktop, which is what the eye actually wants at each size.
 *
 * 2. THE LIST SEMANTICS ARE REAL. A grid of cards is a list of results, so it is
 *    a <ul> of <li>, not a table — nothing here is tabular data a user compares
 *    across rows, and a table would imply column headers that do not exist.
 *
 * 3. AN EMPTY GRID IS NOT RENDERED. When every file failed, the page shows the
 *    failed list and no grid at all, rather than a "0 results" shell.
 *
 * 4. THE GRID FADES ONCE ON SCROLL, THE CARDS STAGGER INDIVIDUALLY. The container
 *    reveal is the page's section entrance; the per-card stagger belongs to
 *    ResultCard so the two never fight over the same element's opacity.
 */

'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import * as React from 'react';

import { ResultCard } from '@/components/camerlob/ResultCard';
import type { FileConversionResult } from '@/store/conversionStore';

export interface ResultGridProps {
  results: readonly FileConversionResult[];
}

export function ResultGrid({ results }: ResultGridProps) {
  const reduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px -8% 0px' });

  if (results.length === 0) return null;

  return (
    <motion.ul
      ref={ref}
      role="list"
      aria-label={`${results.length} converted file${results.length === 1 ? '' : 's'}`}
      initial={reduceMotion || inView ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      // `min-w-0` on every track: a grid item defaults to `min-width: auto`, so a
      // <li> whose card holds a long unbroken filename will refuse to shrink
      // below its content and push the page into a horizontal scrollbar. The
      // single-column track at the 340px floor is the only place it bites.
      className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {results.map((result, index) => (
        <ResultCard key={result.id} result={result} index={index} />
      ))}
    </motion.ul>
  );
}
