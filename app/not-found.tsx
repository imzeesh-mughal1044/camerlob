/**
 * app/not-found.tsx
 * The 404. No navbar, no footer, because it lives outside the (shell) group.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE COPY IS THE JOKE, AND IT IS THE COPY SPECIFIED. "The page you're looking
 *    for was probably converted to something else" is a pun that only lands
 *    because the product is a converter. Rewriting it into something more literal
 *    would have cost the only moment of voice on this screen.
 *
 * 2. THE AURORA IS DAMPED WITH A SCRIM AND A DESATURATION, NOT A NEW COMPONENT.
 *    `AnimatedBackground` takes no props and animates on a rAF loop reading
 *    `Date.now()`, so "0.5x speed" is not reachable from the outside — a wrapper
 *    can slow a CSS animation but not a canvas. What the intent behind "calmer"
 *    actually needs is *less attention*, and a 55% black scrim plus
 *    `saturate(0.55)` delivers that without touching a file outside this task's
 *    scope or forking a 350-line canvas component. The alternative — editing
 *    AnimatedBackground to accept a `speed` prop — is the right change, and is
 *    filed as a follow-up rather than smuggled in here.
 *
 * 3. THE CORNER APERTURE ROTATES ONCE EVERY 40s. A dead page should feel dead.
 *    40s is slow enough that a visitor who stays does not consciously notice it,
 *    and fast enough that the shape is unmistakably alive if they are watching.
 *    It is `aria-hidden` and it stops entirely under reduced motion.
 *
 * 4. THE HEADLINE USES INSTRUMENT SERIF AT 56px, NOT THE DISPLAY SCALE. A 404 is
 *    a single line of type; the 72px hero treatment would be shouting about
 *    nothing.
 *
 * 5. ONE LINK, AND IT IS THE ONLY FOCUSABLE THING. The page has no other controls
 *    and no other focus targets, so Tab lands on "Return home" immediately.
 * 6. THIS FILE IS A CLIENT COMPONENT, AND IT MUST STAY ONE. It calls
 *    `buttonClasses`, which is exported from components/ui/button.tsx — a `'use
 *    client'` module. A server component importing from a client module receives a
 *    client-reference proxy, not the real binding, so calling it during
 *    prerender throws `TypeError: u is not a function` and takes the whole build
 *    down with a failure on every route. This is not a stylistic choice; removing
 *    the directive breaks `next build`.
 */

'use client';

import { AnimatedBackground } from '@/components/camerlob/AnimatedBackground';
import { buttonClasses } from '@/components/ui/button';
import Link from 'next/link';

const BLADES = 6;
const RADIUS = 44;

export default function NotFound() {
  return (
    <div className="relative min-h-svh">
      {/* Decision 2: the same aurora, damped. */}
      <div aria-hidden="true" className="[&_canvas]:saturate-[0.55]">
        <AnimatedBackground />
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-black/55" />

      {/* Decision 3: the corner glyph. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="aperture-spin-slowest pointer-events-none absolute bottom-8 right-8 size-24 text-aqua-500/25 sm:size-32"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      >
        <circle cx="50" cy="50" r={RADIUS} />
        {Array.from({ length: BLADES }, (_, index) => {
          const start = (index / BLADES) * Math.PI * 2;
          const end = start + Math.PI / BLADES;
          const mid = (start + end) / 2;
          const x1 = 50 + RADIUS * Math.cos(start);
          const y1 = 50 + RADIUS * Math.sin(start);
          const x2 = 50 + RADIUS * Math.cos(end);
          const y2 = 50 + RADIUS * Math.sin(end);
          const x3 = 50 + RADIUS * 0.3 * Math.cos(mid);
          const y3 = 50 + RADIUS * 0.3 * Math.sin(mid);
          return (
            <path
              key={index}
              d={`M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z L ${x3.toFixed(2)} ${y3.toFixed(2)} Z`}
            />
          );
        })}
      </svg>

      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center px-6 py-20 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-aqua-400">{'// 404'}</p>

        <h1 className="mt-5 max-w-[18ch] font-serif text-[2.5rem] leading-[1.05] tracking-[-0.02em] text-text-primary sm:text-[3.5rem]">
          This format doesn&apos;t exist.
        </h1>

        <p className="measure-prose mt-5 text-base text-text-secondary">
          The page you&apos;re looking for was probably converted to something else.
        </p>

        <Link href="/" className={`${buttonClasses({ variant: 'primary', size: 'md' })} mt-10`}>
          Return home
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
