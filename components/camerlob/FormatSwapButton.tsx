/**
 * components/camerlob/FormatSwapButton.tsx
 * The circular control between the source and target panels.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE HIT AREA IS 44px, THE CIRCLE IS 40px. The spec asks for a 40x40 button,
 *    which is 4px under the 44px minimum target size. Rather than change the
 *    specified size or ignore the guidance, the visual circle stays 40px and an
 *    `::after` pseudo-element extends the clickable box to 44x44. A pseudo-element
 *    is part of its originating element for hit-testing, so the extra 2px per
 *    side is genuinely tappable without a visible frame around it.
 *
 * 2. THE HOVER ROTATION IS 180deg, NOT 360deg. The icon is a two-arrow loop, so
 *    half a turn already reads as "reversed" — the same affordance as the
 *    direction glyph on a transport control. A full turn reads as a loading
 *    spinner, which would collide with the progress ring on the action bar.
 *
 * 3. THE ROTATION IS PAUSED WHILE THE CLICK ANIMATION PLAYS. The icon nudges
 *    with the press (`scale 0.98`) and returns; combining a continuous rotation
 *    transform with the shared `buttonMotion` scale would make one clobber the
 *    other, since both target `transform`. The rotation lives on an inner span so
 *    the two transforms compose instead of fighting.
 *
 * 4. DISABLED, NOT HIDDEN, WHEN THE PAIR IS INCOMPLETE. Swapping needs two values
 *    to trade. A visible-but-disabled control explains why nothing happened;
 *    removing it would leave the user hunting for the cause.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeftRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface FormatSwapButtonProps {
  onSwap: () => void;
  disabled?: boolean;
  className?: string;
}

export function FormatSwapButton({ onSwap, disabled = false, className }: FormatSwapButtonProps) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.button
      type="button"
      onClick={onSwap}
      disabled={disabled}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      aria-label="Swap source and target formats"
      className={cn(
        'relative grid size-10 shrink-0 place-items-center rounded-full',
        'border border-aqua-500/60 bg-bg-secondary text-aqua-400',
        // The 44px hit area described in decision 1.
        'after:absolute after:-inset-1 after:content-[""]',
        'transition-colors duration-300 ease-camerlob-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400',
        'disabled:cursor-not-allowed disabled:border-border-subtle disabled:text-text-disabled',
        !disabled && 'enabled:hover:border-aqua-400 enabled:hover:bg-aqua-500/10',
        className
      )}
      {...(reduceMotion
        ? { whileTap: { scale: 0.98 } }
        : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.98 } })}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.span
        aria-hidden="true"
        className="grid place-items-center"
        animate={reduceMotion ? undefined : { rotate: hovered && !disabled ? 180 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <ArrowLeftRight className="size-4" strokeWidth={1.75} />
      </motion.span>
    </motion.button>
  );
}
