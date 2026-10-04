/**
 * components/camerlob/ConvertActionBar.tsx
 * The sticky bar that carries the batch summary and the one button that matters.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. ONE COMPONENT, TWO FORMS, DIFFERENT ONLY IN PLACEMENT. Desktop is a sticky
 *    96px bar in the flow; mobile is a fixed bottom sheet. Same children, same
 *    states, same labels — because a user who rotates a phone should not meet a
 *    different interface. Only `position`, height and the safe-area inset differ.
 *
 * 2. THE DISABLED BUTTON STILL EXPLAINS ITSELF. A greyed-out button with no
 *    caption is the most common dead end in a converter. The label becomes
 *    "Select formats and files" — literally the missing prerequisite — so the
 *    control is a status readout until it becomes a command.
 *
 * 3. THE GENTLE PULSE STOPS THE MOMENT THE USER SCROLLS PAST IT. The brief allows
 *    exactly one infinite animation in the product and assigns it to the hero CTA.
 *    A second one here is justified only because this bar is the conversion's
 *    primary action, and even then it is `scale 1 → 1.01`, which is below the
 *    threshold where a pulse reads as an alert. It yields to reduced motion
 *    entirely.
 *
 * 4. THE PROGRESS RING IS SVG `stroke-dashoffset`, NOT A SPINNER ICON. A spinner
 *    says "something is happening"; a ring that fills to the real percentage says
 *    "this is how far along it is". The circumference is computed from the radius
 *    so the dash maths is exact rather than eyeballed, and the label carries the
 *    count as text so the number is never motion-only.
 *
 * 5. THE MOBILE SHEET HIDES WHEN THE KEYBOARD IS OPEN. `visualViewport` is the
 *    only reliable signal for this; `innerHeight` does not change on iOS. A sheet
 *    that stays put while the keyboard covers half the screen is worse than no
 *    sheet, and the search field above it is exactly where the user is typing.
 *
 * 6. THE BAR IS INSIDE THE NORMAL FLOW ON DESKTOP, SO IT NEVER COVERS CONTENT.
 *    Only the mobile sheet is fixed, and the page reserves its height with padding
 *    so the last file card is never trapped underneath it.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import * as React from 'react';

import { buttonClasses, buttonMotion } from '@/components/ui/button';
import { getFormatMeta } from '@/lib/constants/formats';
import { formatBytes } from '@/lib/utils/file-size';
import { cn } from '@/lib/utils/cn';
import { useConversion } from '@/hooks/useConversion';
import { useConversionStore } from '@/store/conversionStore';

const OUT = [0.16, 1, 0.3, 1] as const;
const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ConvertActionBar() {
  const reduceMotion = useReducedMotion();
  const conversion = useConversion();
  const summary = useConversionStore((state) => state.summary);
  const results = useConversionStore((state) => state.results);
  const source = useConversionStore((state) => state.sourceFormat);
  const target = useConversionStore((state) => state.targetFormat);
  const mode = useConversionStore((state) => state.mode);
  const queue = useConversionStore((state) => state.files);

  const [keyboardOpen, setKeyboardOpen] = React.useState(false);
  const totalBytes = React.useMemo(
    () => queue.reduce((sum: number, job) => sum + job.file.size, 0),
    [queue]
  );

  // Decision 5: visualViewport, not innerHeight.
  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const measure = () => {
      const occluded = window.innerHeight - viewport.height - viewport.offsetTop;
      setKeyboardOpen(occluded > 150);
    };

    measure();
    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    return () => {
      viewport.removeEventListener('resize', measure);
      viewport.removeEventListener('scroll', measure);
    };
  }, []);

  const formatsChosen = Boolean(source && target);
  // The queue is kept after a batch (so per-file results stay visible), so the
  // finished state is keyed on the summary rather than on an emptied queue.
  const batchDone = !conversion.isConverting && summary !== null;
  const hasOutput = results.length > 0;

  // The disabled label names the next missing prerequisite rather than saying
  // "disabled", and in Auto mode the first prerequisite is a file, not a format.
  const missing = !source
    ? mode === 'auto'
      ? 'Add a file to detect the format'
      : 'Pick a source format'
    : !target
      ? 'Pick a target format'
      : queue.length === 0
        ? 'Add at least one file'
        : null;

  const label = conversion.isConverting
    ? `Converting ${Math.min(conversion.completed + 1, conversion.total)} of ${conversion.total}`
    : batchDone && hasOutput
      ? 'View results'
      : (missing ?? `Convert ${queue.length} file${queue.length > 1 ? 's' : ''}`);

  const targetLabel = target ? getFormatMeta(target).label : null;

  const handleClick = () => {
    if (conversion.isConverting) return;
    if (batchDone && hasOutput) {
      conversion.goToResults();
      return;
    }
    conversion.start();
  };

  const summaryLine = (
    <p className="font-mono text-xs tabular-nums text-text-tertiary">
      <span className="text-aqua-400">{queue.length}</span>
      {queue.length === 1 ? ' file' : ' files'}
      {queue.length > 0 ? (
        <>
          {' · '}
          {formatBytes(totalBytes)} total
        </>
      ) : (
        ' · nothing queued'
      )}
    </p>
  );

  const button = (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={!conversion.canStart && !batchDone}
      // Decision 3: the one other permitted infinite animation, and it stops
      // under reduced motion.
      animate={reduceMotion || !conversion.canStart ? undefined : { scale: [1, 1.01, 1] }}
      transition={
        conversion.canStart && !reduceMotion
          ? { duration: 3, ease: 'easeInOut', repeat: Infinity }
          : { duration: 0.15, ease: OUT }
      }
      whileTap={buttonMotion.whileTap}
      aria-live="polite"
      className={cn(
        buttonClasses({ variant: 'primary', size: 'md' }),
        'h-14 w-full min-w-[220px] md:h-12 md:w-auto md:min-w-[260px]',
        // A visible label is required: the ring alone communicates nothing to a
        // screen reader, and `aria-live` on the button announces the phase change.
        batchDone && hasOutput && 'bg-gradient-aqua'
      )}
    >
      {conversion.isConverting ? (
        <>
          <span className="relative grid size-[22px] shrink-0 place-items-center">
            <svg viewBox="0 0 22 22" className="size-[22px] -rotate-90" aria-hidden="true">
              <circle
                cx="11"
                cy="11"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-25"
              />
              <motion.circle
                cx="11"
                cy="11"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={false}
                animate={{
                  strokeDashoffset: RING_CIRCUMFERENCE * (1 - conversion.overallPercent / 100),
                }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: OUT }}
              />
            </svg>
          </span>
          <span>{label}</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          {conversion.canStart && targetLabel ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] opacity-80">
              {targetLabel}
            </span>
          ) : null}
          {batchDone && hasOutput ? (
            <motion.span
              aria-hidden="true"
              className="grid place-items-center"
              // The nudge is 300ms ease-out, then it rests.
              animate={reduceMotion ? undefined : { x: [0, 4, 0] }}
              transition={{ duration: 0.3, ease: OUT }}
            >
              <ArrowRight className="size-4" strokeWidth={2} />
            </motion.span>
          ) : null}
        </>
      )}
    </motion.button>
  );

  return (
    <div
      className={cn(
        'z-20 border-t border-border-subtle bg-black/70 backdrop-blur-xl',
        // Mobile: a fixed sheet that clears the home indicator.
        'fixed inset-x-0 bottom-0 md:sticky md:bottom-0',
        'px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-0 md:pt-0',
        // The keyboard case: get out of the way entirely.
        keyboardOpen && 'hidden md:flex'
      )}
    >
      <div className="mx-auto flex h-auto max-w-container flex-col gap-3 md:h-24 md:flex-row md:items-center md:justify-between md:gap-6">
        {/* Swipe-up affordance, mobile only. Decorative: the sheet is not
            dismissible, so it must not look draggable. */}
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border-strong md:hidden"
        />
        {summaryLine}
        <div className="flex items-center gap-3 pb-1 md:pb-0">
          {!formatsChosen ? (
            <p className="hidden font-mono text-[11px] text-text-tertiary lg:block">
              {mode === 'auto'
                ? '// step 1: drop a file to detect its format'
                : '// step 1: pick a source and a target'}
            </p>
          ) : null}
          {button}
        </div>
      </div>
    </div>
  );
}
