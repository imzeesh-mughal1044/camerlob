/**
 * components/camerlob/HeroCTA.tsx
 * The hero's call to action: primary "Start converting" and the secondary jump
 * to the format wall.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. THE 3s GLOW PULSE IS A BLURRED SIBLING, NOT A box-shadow ANIMATION.
 *    Animating box-shadow repaints the button on every frame; a blurred
 *    absolutely-positioned div behind the label only changes its opacity, so the
 *    pulse stays on the compositor. The resting glow still comes from the
 *    `primary` button variant's shadow.
 *
 * 2. THE RIPPLE IS SPAWNED FROM THE POINTER POSITION. On pointerdown the offset
 *    within the button is measured, a span is inserted at that point, and it
 *    scales away while fading. Spans are removed from state on completion so the
 *    DOM does not accumulate nodes across repeated clicks.
 *
 * 3. THE SECONDARY ACTION IS A REAL ANCHOR TO #formats. Native smooth scrolling
 *    plus `scroll-padding-top: 6.5rem` in app/globals.css handles the offset, so
 *    there is no JS scroll maths to get wrong, the link is keyboard reachable,
 *    and it degrades to an instant jump. The chevron bounce is decoration only.
 *
 * 4. BOTH ENTRANCES ARE 52px/56px AND FULL-WIDTH ON MOBILE, per the responsive
 *    table: the mobile rule (52px, stacked, full width) wins over the desktop
 *    rule (56px, inline) below the sm breakpoint.
 *
 * 5. INFINITE MOTION IS OPTIONAL. Glow pulse and chevron bounce both resolve to
 *    undefined under useReducedMotion, which leaves the buttons completely
 *    static rather than merely slower.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { buttonClasses, buttonMotion } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function HeroCTA({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const nextId = React.useRef(0);

  const spawnRipple = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const id = nextId.current;
    nextId.current += 1;
    setRipples((current) => [
      ...current,
      { id, x: event.clientX - bounds.left, y: event.clientY - bounds.top },
    ]);
  };

  const clearRipple = (id: number) => {
    setRipples((current) => current.filter((ripple) => ripple.id !== id));
  };

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center', className)}>
      <div className="relative w-full sm:w-auto">
        {/* Pulsing halo: opacity only, so it never repaints the label. */}
        {!reduceMotion ? (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1.5 rounded-xl bg-aqua-500/40 blur-lg"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
          />
        ) : null}

        <motion.a
          href="/convert"
          onPointerDown={spawnRipple}
          className={buttonClasses({
            variant: 'primary',
            size: 'cta',
            className: 'relative h-[52px] w-full justify-center sm:h-14 sm:w-auto',
          })}
          {...buttonMotion}
        >
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              aria-hidden="true"
              className="pointer-events-none absolute size-8 rounded-full bg-white/40"
              style={{ left: ripple.x - 16, top: ripple.y - 16 }}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 14, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              onAnimationComplete={() => clearRipple(ripple.id)}
            />
          ))}
          <span className="relative">Start converting</span>
          <span aria-hidden="true" className="relative">
            &rarr;
          </span>
        </motion.a>
      </div>

      <motion.a
        href="#formats"
        className={cn(
          'group inline-flex h-[52px] items-center justify-center gap-1.5 text-sm font-medium',
          'text-text-secondary transition-colors duration-200 ease-camerlob-out',
          'hover:text-aqua-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400',
          'sm:h-11'
        )}
        {...buttonMotion}
      >
        <span className="relative">
          See supported formats
          {/* Underline draws from the inline-start edge on hover. */}
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-aqua-400 transition-transform duration-200 ease-camerlob-out group-hover:scale-x-100"
          />
        </span>
        <motion.span
          aria-hidden="true"
          animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </motion.a>
    </div>
  );
}
