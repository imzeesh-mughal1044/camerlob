/**
 * components/camerlob/StepRow.tsx
 * Section 02: the three-step process, laid out as wide editorial rows rather
 * than a three-column icon grid.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. THE NUMBER IS THE HEADLINE. At 96px in light-weight mono the step numeral
 *    carries the row; the title is only 24px. That inversion is what stops this
 *    reading as a feature grid. Below 768px the numeral drops to 64px and the
 *    columns stack.
 *
 * 2. ALTERNATION STARTS AT xl, NOT AT EVERY BREAKPOINT. Odd rows put the numeral
 *    in the first column, even rows push it to the last, which gives the stack a
 *    zigzag rhythm on wide screens without disturbing the tablet two-column
 *    layout, where the numeral always leads.
 *
 * 3. THE DIVIDER DRAWS WITH scaleX, NOT width. `width` triggers layout on every
 *    frame; `scaleX` with `origin-left` is a compositor-only transform and
 *    reaches the identical result. The draw is 200ms, per the micro-interaction
 *    spec, and fires once from useInView.
 *
 * 4. ILLUSTRATIONS ARE INLINE SVG, NOT IMAGES. Three hairline diagrams on a
 *    64-unit grid, stroked in aqua at 1.5px to match the aperture blades, so
 *    they inherit `currentColor` and stay crisp at any size. Each is
 *    `aria-hidden`: the step title and body already carry the meaning, and a
 *    duplicated description would be noise.
 */

'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export type StepIllustration = 'pair' | 'drop' | 'download';

export interface StepRowProps {
  /** 1-based step number. */
  step: number;
  title: string;
  description: string;
  illustration: StepIllustration;
  /** Draw the hairline above this row. False for the first step. */
  divider?: boolean;
  className?: string;
}

function Illustration({ variant }: { variant: StepIllustration }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (variant === 'pair') {
    // Two format chips with a two-way arrow: conversion is reversible.
    return (
      <svg viewBox="0 0 64 40" className="size-16" aria-hidden="true">
        <rect x="1" y="4" width="18" height="14" rx="2" {...common} />
        <rect x="45" y="22" width="18" height="14" rx="2" {...common} />
        <path d="M22 11h14a3 3 0 0 1 3 3v0" {...common} />
        <path d="M36 10l4 4-4 4" {...common} />
        <path d="M42 29H28a3 3 0 0 1-3-3v0" {...common} />
        <path d="M28 30l-4-4 4-4" {...common} />
      </svg>
    );
  }

  if (variant === 'drop') {
    // A tray with a file descending into it.
    return (
      <svg viewBox="0 0 64 40" className="size-16" aria-hidden="true">
        <path d="M6 26v8a2 2 0 0 0 2 2h48a2 2 0 0 0 2-2v-8" {...common} />
        <path d="M32 4v18" {...common} />
        <path d="M26 16l6 6 6-6" {...common} />
        <path d="M14 26h36" {...common} opacity={0.4} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 40" className="size-16" aria-hidden="true">
      {/* Archive box with a download arrow: single file or whole ZIP. */}
      <path d="M8 16h48v20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V16Z" {...common} />
      <path d="M6 8h52v8H6z" {...common} />
      <path d="M32 20v10" {...common} />
      <path d="M28 26l4 4 4-4" {...common} />
    </svg>
  );
}

export function StepRow({
  step,
  title,
  description,
  illustration,
  divider = true,
  className,
}: StepRowProps) {
  const reduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px -15% 0px' });

  const number = String(step).padStart(2, '0');
  const flip = step % 2 === 0;

  return (
    <div ref={ref} className={className}>
      {divider ? (
        <motion.div
          aria-hidden="true"
          className="mb-10 h-px w-full origin-left bg-border-subtle md:mb-14"
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={inView || reduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      ) : null}

      <motion.div
        className="grid grid-cols-1 items-start gap-6 md:grid-cols-12 md:gap-8"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={inView || reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Numeral. Order flips on wide screens for rhythm. */}
        <div
          className={cn(
            'md:col-span-4 md:row-start-1',
            flip ? 'xl:order-2 xl:col-start-9' : 'xl:order-1'
          )}
        >
          <span
            aria-hidden="true"
            className="block font-mono text-[64px] font-light leading-none tracking-tight text-aqua-400 md:text-[96px]"
          >
            {number}
          </span>
        </div>

        {/* Copy plus the illustration pinned to the row's trailing edge. */}
        <div
          className={cn(
            'flex items-start justify-between gap-6 md:col-span-8 md:row-start-1',
            flip ? 'xl:order-1 xl:col-start-1' : 'xl:order-2'
          )}
        >
          <div className="max-w-xl">
            <h3 className="text-2xl font-medium text-text-primary">{title}</h3>
            <p className="mt-3 text-base text-text-secondary">{description}</p>
          </div>
          <div className="hidden shrink-0 text-aqua-500/70 sm:block">
            <Illustration variant={illustration} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
