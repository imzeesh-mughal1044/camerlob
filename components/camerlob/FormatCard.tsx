/**
 * components/camerlob/FormatCard.tsx
 * One cell in the supported-formats grid.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. THE GRID IS A LIST, NOT A SET OF BUTTONS. The cards are a marketing
 *    showcase with a hover flourish and nothing else, so they render as <li>
 *    inside a <ul> and expose their label as text. Marking a non-interactive
 *    element with a button role and an aria-label would lie to a screen reader
 *    about what activating it does. The description rides along in `title`.
 *
 * 2. THE CORNER TICK IS BORDERS, NOT A BORDER IMAGE. Two 2px edges of an 8px
 *    box give a true L; it scales from the top-left with transform-origin set to
 *    that corner, so it grows outward from the point it belongs to.
 *
 * 3. THE HOVER LIFT IS 2px, NOT A SHADOW BLOOM. translateY(-2px) plus a
 *    translateZ(0) promotion keeps the movement on the compositor; a growing
 *    box-shadow would repaint on every frame of the transition.
 *
 * 4. THE "SELECTED" STATE EXISTS ONLY TO SHOWCASE THE STYLE. Nothing is
 *    selectable here: the real picker lives in the converter. FormatGrid drives
 *    it, and it cycles a random format every 4s purely so a visitor sees the
 *    treatment once without hunting for it.
 *
 * 5. NO MOTION UNDER REDUCED MOTION. The lift and the tick are CSS transitions,
 *    which styles/globals.css already collapses to 0.01ms, so the card simply
 *    changes colour when the user has asked for stillness.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils/cn';

export interface FormatCardProps {
  /** Uppercase display name, e.g. "JPG". */
  label: string;
  /** Full sentence shown in the native tooltip. */
  description: string;
  /** Lowercase format id, used as a stable React key by the parent. */
  id: string;
  /** Renders the aqua-gradient "selected" treatment. */
  selected?: boolean;
  /** Stagger index, used for the filter-in delay. */
  index?: number;
}

export function FormatCard({
  label,
  description,
  id,
  selected = false,
  index = 0,
}: FormatCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      layout={!reduceMotion}
      // 150ms transition; the delay is a 15ms stagger capped at eight steps so a
      // 40-card grid does not take six seconds to settle.
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: selected && !reduceMotion ? 1.05 : 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
      transition={{
        duration: 0.15,
        ease: [0.16, 1, 0.3, 1],
        delay: reduceMotion ? 0 : Math.min(index, 8) * 0.015,
      }}
      title={description}
      data-format={id}
      data-selected={selected || undefined}
      className={cn(
        'group relative grid h-14 place-items-center overflow-hidden rounded-md border',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-camerlob-out',
        'md:h-16',
        selected
          ? 'scale-105 border-transparent bg-gradient-aqua text-text-on-accent shadow-glow-md'
          : [
              'border-border-subtle bg-bg-secondary text-text-secondary',
              'hover:-translate-y-0.5 hover:border-aqua-500/40 hover:bg-bg-tertiary hover:text-aqua-400 hover:shadow-glow-sm',
            ]
      )}
    >
      {/* 4px corner tick, top-left. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-1 top-1 size-2 origin-top-left scale-0 border-l-2 border-t-2 transition-transform duration-200 ease-camerlob-out',
          'group-hover:scale-100',
          selected ? 'border-text-on-accent' : 'border-aqua-500'
        )}
      />
      <span className="font-mono text-xs uppercase tracking-[0.08em]">{label}</span>
    </motion.li>
  );
}
