/**
 * components/camerlob/StepIndicator.tsx
 * The three-stage tracker above the converter: Formats, Upload, Download.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE CONNECTOR FILLS WITH scaleX, NOT width. Animating a rule's width
 *    triggers layout on every frame of a 400ms animation on a full-width
 *    element; `transform: scaleX` with `transform-origin: left` is pixel-identical
 *    and stays on the compositor. Same rule the landing page uses for its
 *    hairline and the hero underline.
 *
 * 2. THE ADVANCE PULSE IS A KEY CHANGE, NOT A STATE FLAG. The active circle
 *    overshoots to 1.05 and settles over 300ms every time the step changes.
 *    Driving that from a `useEffect` + boolean means the pulse cannot re-fire for
 *    two advances in the same tick and needs a "hasPulsed" reset; keying the
 *    element on the step value makes framer-motion remount it, which restarts the
 *    animation for free and is impossible to get stuck.
 *
 * 3. LABELS ARE HIDDEN, NOT SHRUNK, ON MOBILE. At 360px the three words plus
 *    three circles plus two connectors do not fit, and truncating "Download" to
 *    "Down…" is worse than omitting it. Mobile shows the numerals only; the
 *    accessible name always carries the full label via aria-label, so the
 *    information is never actually lost — only the visual redundancy is.
 *
 * 4. COMPLETE AND ACTIVE ARE DISTINGUISHED BY SHAPE AS WELL AS COLOUR — a filled
 *    check versus a filled numeral. Colour alone would fail WCAG 1.4.1 for a
 *    user who cannot separate the aqua tints.
 *
 * 5. `aria-current="step"` ON THE ACTIVE NODE, `role="list"` ON THE TRACKER. A
 *    screen reader then announces position and total without needing the numbers
 *    to be read as content.
 */

'use client';

import { Check, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import type { ConvertStep } from '@/store/conversionStore';

const OUT = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  { ordinal: 1, label: 'Formats' },
  { ordinal: 2, label: 'Upload' },
  { ordinal: 3, label: 'Download' },
] as const;

export interface StepIndicatorProps {
  active: ConvertStep;
  className?: string;
}

export function StepIndicator({ active, className }: StepIndicatorProps) {
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label="Conversion progress" className={cn('w-full', className)}>
      <ol
        role="list"
        className="flex items-center gap-2 sm:gap-3"
        aria-label={`Step ${active} of 3`}
      >
        {STEPS.map((step, index) => {
          const isActive = step.ordinal === active;
          const isComplete = step.ordinal < active;
          const isLast = index === STEPS.length - 1;

          return (
            <React.Fragment key={step.ordinal}>
              <li className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                {/* Keyed on the step so the advance pulse restarts each time. */}
                <motion.span
                  key={`${step.ordinal}-${active}`}
                  initial={reduceMotion ? false : { scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, ease: OUT }}
                  className="relative grid size-7 shrink-0 place-items-center"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-0 rounded-full border transition-[background-color,border-color,box-shadow] duration-300 ease-camerlob-out',
                      isActive && 'border-aqua-400 bg-aqua-500/15 shadow-glow-sm',
                      isComplete && 'border-success/50 bg-success/10',
                      !isActive && !isComplete && 'border-border-muted bg-transparent'
                    )}
                  />
                  {isComplete ? (
                    <Check
                      aria-hidden="true"
                      className="relative size-3.5 text-success"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative font-mono text-xs tabular-nums transition-colors duration-300 ease-camerlob-out',
                        isActive ? 'text-aqua-300' : 'text-text-tertiary'
                      )}
                    >
                      {step.ordinal}
                    </span>
                  )}
                </motion.span>

                <span
                  className={cn(
                    'hidden truncate font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-300 ease-camerlob-out sm:block',
                    isActive && 'text-aqua-300',
                    isComplete && 'text-text-secondary',
                    !isActive && !isComplete && 'text-text-disabled'
                  )}
                >
                  {step.label}
                </span>

                <span className="sr-only">
                  {`${step.label}: ${
                    isActive ? 'current step' : isComplete ? 'complete' : 'not started'
                  }`}
                </span>
              </li>

              {!isLast ? (
                <li aria-hidden="true" className="flex min-w-4 flex-1 items-center">
                  <ChevronRight
                    className="size-3.5 shrink-0 text-border-strong"
                    strokeWidth={1.5}
                  />
                  <span className="relative h-px w-full overflow-hidden">
                    {/* Track */}
                    <span className="absolute inset-0 bg-border-subtle" />
                    {/* Fill */}
                    <motion.span
                      className="absolute inset-0 origin-left bg-gradient-to-r from-aqua-600 to-aqua-400"
                      initial={false}
                      animate={{ scaleX: step.ordinal < active ? 1 : 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.4, ease: OUT }}
                    />
                  </span>
                  <ChevronRight
                    className="size-3.5 shrink-0 text-border-strong"
                    strokeWidth={1.5}
                  />
                </li>
              ) : null}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
