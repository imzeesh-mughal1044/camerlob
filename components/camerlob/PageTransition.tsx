/**
 * components/camerlob/PageTransition.tsx
 * Route-change choreography for every page in the (shell) group.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. EXIT AND ENTRY HAVE DIFFERENT CURVES, NOT DIFFERENT DURATIONS ALONE. The
 *    exit is a 150ms opacity fade on the ease-in curve — the brief's rule that
 *    anything leaving the screen decelerates. The entry is a 300ms
 *    opacity-plus-8px rise on the ease-out curve. Using one transition object for
 *    both is the usual mistake and it makes the departure feel sluggish.
 *
 * 2. `mode="wait"`. Overlapping the two pages would cross-fade a full-height
 *    converter and a full-height result page through each other, producing a
 *    muddy double-exposure for 300ms. Waiting for the exit keeps exactly one page
 *    on screen at a time, which is why the departure is short.
 *
 * 3. `initial={false}` SO THE FIRST PAINT IS NOT FADED. Without it the landing
 *    page would animate in on a cold load, on top of the entrance choreography it
 *    already owns, and the hero would arrive twice. Animations should belong to
 *    navigation, not to the first render.
 *
 * 4. REDUCED MOTION DROPS THE TRANSFORM AND KEEPS A CROSSFADE. A hard cut is
 *    disorienting when the page has scrolled; a 100ms opacity fade communicates
 *    "the page changed" without any movement. This is the brief's rule that
 *    transforms collapse rather than that animation disappears.
 *
 * 5. THE KEY IS THE PATHNAME, NOT A COUNTER. Keying on a counter is the standard
 *    workaround for the fact that a layout is not remounted on navigation, and it
 *    works — but it also fires on a query-string change, which is not a page
 *    change. `usePathname` changes exactly when the page does.
 *
 * NOTE ON RELIABILITY: a Next.js App Router layout is preserved across
 * navigation rather than remounted, so the exit animation is driven by the
 * layout re-rendering with a new `children` prop and AnimatePresence holding the
 * previous element. This is the documented pattern and it holds as long as the
 * layout is a client component, which is why (shell)/layout.tsx carries
 * 'use client'.
 */

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import * as React from 'react';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.7, 0, 0.84, 0] as const;
const FADE_MS = 100;
const EXIT_MS = 150;
const ENTER_MS = 300;
const RISE_PX = 8;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const variants = {
    initial: { opacity: 0, y: reduceMotion ? 0 : RISE_PX },
    enter: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? FADE_MS / 1000 : ENTER_MS / 1000, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      transition: { duration: reduceMotion ? FADE_MS / 1000 : EXIT_MS / 1000, ease: EASE_IN },
    },
  } as const;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
        // The wrapper must not clip: the converter's fixed bottom sheet and the
        // landing hero's scroll hint both extend past their own bounds.
        className="min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
