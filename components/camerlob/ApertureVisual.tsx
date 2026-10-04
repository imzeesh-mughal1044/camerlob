/**
 * components/camerlob/ApertureVisual.tsx
 * The hero's right-hand visual: a six-blade iris turning once a minute, with
 * the target formats cycling inside it, and a camera-lens gesture on hover.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. THE BLADES ARE GEOMETRY, NOT ART. Six chords sit 26 units off-centre inside
 *    a 200-unit viewBox, each rotated 60 degrees from the last, which resolves
 *    into a hexagonal iris. Drawn as SVG strokes rather than images so the
 *    1.5px hairline stays crisp at 600px and costs nothing to scale.
 *
 * 2. THE WHOLE ASSEMBLY IS ONE TRANSFORM. The glow behind it breathes on its own
 *    6s cycle, deliberately out of phase with the rotation so the two never look
 *    mechanically locked.
 *
 * 3. CROSSFADE USES mode="wait". The outgoing label finishes leaving before the
 *    incoming one arrives, so the two never overlap into an unreadable blur.
 *    The slide is 10px vertical, paired with a 0.45s ease-out.
 *
 * 4. REDUCED MOTION IS EXPLICIT, NOT INHERITED. An infinite `rotate` and a 2.5s
 *    interval would both keep running and swapping content under a user who
 *    asked for stillness. So useReducedMotion() also freezes the blades on a
 *    static angle, pins the label to the first format, and reduces the hover
 *    gesture to a 1.02 nudge with no retime and no shadow transition.
 *
 * 5. HIDDEN BELOW 1280px BY THE PARENT. The brief hides the visual on phone and
 *    tablet so the hero copy carries the weight; it reappears at the xl
 *    breakpoint where the 12-column split has room for it.
 *
 * 6. ONE `engaged` FLAG DRIVES EVERY HOVER EFFECT. A single boolean rather than
 *    four independent variants, because the four effects have to agree: the
 *    scale, the blade opening, the rotation retime, the glow and the chip
 *    brightness are one gesture, and separate variants would let a
 *    reduced-motion run desynchronise them. `onPointerDown` layers a brief 1.02
 *    "snap" on top of the open state, the way a lens settles when it focuses.
 *
 * 7. THE ROTATION IS CSS, THE GESTURE IS FRAMER, AND THEY CANNOT SHARE A NODE.
 *    A running CSS animation outranks an inline `transform`, so a Framer scale
 *    written onto the same <g> would be silently discarded. Two nested groups
 *    fix it: the outer scales (the blades opening) and the inner rotates. The
 *    rotation is CSS specifically because `animation-duration` can be changed on
 *    an already-running animation to retime it in place, whereas a Framer
 *    `repeat: Infinity` is torn down and rebuilt on every hover and the blades
 *    visibly snap back to 0deg. Both animation utilities name the same keyframe
 *    set; only the period changes, 60s -> 45s.
 *
 * 8. NOTHING HERE AFFECTS LAYOUT. Every animated property is `transform`,
 *    `opacity` or `box-shadow`, and the container keeps its fixed 500/600px box,
 *    so hovering can never reflow the hero copy beside it. At 1.06 the 500px box
 *    is 530px, still inside the 576px the xl column actually provides.
 *
 * 9. TOUCH HAS NO HOVER, SO A TAP OPENS THE LENS TEMPORARILY. `onTouchStart` is
 *    React's passive listener — no `preventDefault` — so a swipe that starts on
 *    the iris still scrolls the page.
 */

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';

/** Formats cycled inside the iris, in the order the spec lists them. */
const CYCLE = ['JPG', 'PNG', 'AVIF', 'WEBP'] as const;

const CYCLE_MS = 2500;
const BLADE_COUNT = 6;
const LENS_EASE = [0.16, 1, 0.3, 1] as const;
/** Hover in and hover out, matched so the gesture is symmetric. */
const HOVER_MS = 500;
/** How long a tap holds the lens open, standing in for a hover on touch. */
const TOUCH_MS = 800;
/** How long the click "snap" lasts. */
const SNAP_MS = 180;

/** One blade: a chord offset from the centre, rotated into place. */
function blade(index: number) {
  const angle = index * (360 / BLADE_COUNT);
  return {
    key: index,
    angle,
    // Nearer blades sit slightly brighter, which reads as depth under rotation.
    opacity: 0.35 + (index % 3) * 0.22,
    x1: 126,
    y1: 14,
    x2: 126,
    y2: 86,
  };
}

export function ApertureVisual({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  // Decision 6: one flag for the whole lens gesture.
  const [engaged, setEngaged] = useState(false);
  const [snapped, setSnapped] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Queue a release, so a tap cannot be re-armed by a second handler. */
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % CYCLE.length);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  // Every pending timer is cleared on unmount, or a tap that outlives the
  // component would set state on something that is gone.
  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
      timers.current = [];
    },
    []
  );

  // Reduced motion still gets *some* acknowledgement, just a much smaller one.
  const openScale = reduceMotion ? 1.02 : 1.06;
  const lensTransition = { duration: reduceMotion ? 0 : HOVER_MS / 1000, ease: LENS_EASE };

  return (
    <motion.div
      onHoverStart={() => setEngaged(true)}
      onHoverEnd={() => setEngaged(false)}
      // Decision 9: passive touch — engage, hold, release.
      onTouchStart={() => {
        if (reduceMotion) return;
        setEngaged(true);
        later(() => setEngaged(false), TOUCH_MS);
      }}
      onPointerDown={() => {
        if (reduceMotion) return;
        setSnapped(true);
        later(() => setSnapped(false), SNAP_MS);
      }}
      animate={{ scale: engaged ? (snapped ? 1.02 : openScale) : 1 }}
      transition={lensTransition}
      className={cn(
        // text-aqua-* is set here, not inherited: the blades and the inner ring
        // are stroked with `currentColor`, so the colour must be self-contained.
        'relative grid place-items-center text-aqua-400',
        // 500px at desktop, 600px on wide displays.
        'size-[500px] 2xl:size-[600px]',
        className
      )}
    >
      {/* Soft radial glow: blur 120px at 12% opacity, breathing 1 -> 1.05. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[18%] rounded-full bg-aqua-500/30 blur-[120px]"
        style={{ opacity: 0.12 }}
        animate={reduceMotion ? undefined : { scale: [1, 1.05, 1], opacity: [0.12, 0.18, 0.12] }}
        transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
      />

      {/* Decision 7: the halo uses the theme's own shadow tokens, so no colour
          is hardcoded here, and it rides the same `engaged` flag as everything
          else. `rounded-full` makes the shadow circular rather than a square
          glow around the bounding box. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-[7%] rounded-full',
          'transition-shadow ease-camerlob-out',
          reduceMotion ? '' : 'duration-500',
          engaged ? 'shadow-glow-lg' : 'shadow-glow-sm'
        )}
      />

      {/* The iris. */}
      <svg
        viewBox="0 0 200 200"
        className="gpu absolute inset-0 size-full"
        role="presentation"
        aria-hidden="true"
      >
        {/* Outer group: the blades opening. Scaling about the centre carries
            each chord outward along its own radial axis, which is what a real
            iris does as it opens. 1.09 over a 200-unit viewBox rendered at
            500px is roughly 6px of travel at the blades' own radius. */}
        <motion.g
          style={{ transformOrigin: '100px 100px' }}
          animate={{ scale: engaged ? 1.09 : 1 }}
          transition={lensTransition}
        >
          {/* Inner group: the rotation, in CSS. `transform-box: view-box` makes
              `100px 100px` resolve against the viewBox rather than the element
              box, which is what puts the origin on the iris centre. */}
          <g
            className={
              reduceMotion
                ? undefined
                : engaged
                  ? 'animate-aperture-rotate-fast'
                  : 'animate-aperture-rotate'
            }
            style={{ transformBox: 'view-box', transformOrigin: '100px 100px' }}
          >
            {Array.from({ length: BLADE_COUNT }, (_, i) => {
              const b = blade(i);
              return (
                <line
                  key={b.key}
                  x1={b.x1}
                  y1={b.y1}
                  x2={b.x2}
                  y2={b.y2}
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  opacity={b.opacity}
                  transform={`rotate(${b.angle} 100 100)`}
                />
              );
            })}
          </g>
        </motion.g>

        {/* Static inner ring, so the aperture has a fixed frame to turn within. */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.18}
        />
      </svg>

      {/* The cycling format label. */}
      <div className="relative z-10 grid h-10 place-items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={reduceMotion ? CYCLE[0] : CYCLE[index]}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: LENS_EASE }}
            className={cn(
              'label-mono rounded-md border bg-black-900/70 px-3 py-2 text-sm backdrop-blur-sm',
              'transition-colors ease-camerlob-out',
              reduceMotion ? '' : 'duration-500',
              engaged ? 'border-aqua-500/60 text-aqua-300' : 'border-aqua-500/30'
            )}
          >
            {reduceMotion ? CYCLE[0] : CYCLE[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
