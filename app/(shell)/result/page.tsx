/**
 * app/(shell)/result/page.tsx
 * The result: a headline that counts, four numbers, a grid of cards, and the
 * failures if there were any.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE PAGE READS FROM THE STORE, NEVER FROM THE URL. A Blob cannot be
 *    serialised into a query string, so /result has no shareable, refreshable
 *    state — a hard refresh lands on the empty state, which is the correct and
 *    honest outcome for a tool that promises nothing is stored. Copying the link
 *    is therefore not something this page can offer, and does not pretend to.
 *
 * 2. THE HEADLINE MASKS ITSELF IN ONLY ON A CLEAN RUN. "All done." earns a
 *    left-to-right wipe and a particle burst because there is genuinely something
 *    to celebrate. On a partial run the headline states the count — "6 of 7
 *    done." — in plain text with no ceremony, because celebrating 86% would be
 *    tone-deaf next to a red-orange failure block three scrolls down.
 *
 * 3. THE CELEBRATION IS TEN DOTS AND NOT A CONFETTI ENGINE. Each is a 4px aqua
 *    circle on its own vector, expanding and fading over 800ms, all on the
 *    compositor. It sits *behind* the headline at low opacity so it reads as a
 *    ripple of light rather than as particles flying at the reader.
 *
 * 4. THE BACK LINK AND THE PRIMARY ACTION SHARE A ROW. "← Convert more" is a
 *    ghost, "Download all as ZIP" is aqua, and clearing results is a text button
 *    that sits between them at low emphasis — it is the destructive one and must
 *    not out-shout the action people came for.
 *
 * 5. THE STICKY ACTION BAR IS `top-0` WITH A SCROLL OFFSET, NOT `top-[72px]`.
 *    The navbar is fixed and 56/64/72px tall by breakpoint, so a hard-coded offset
 *    would gap or overlap at two of the three sizes. `scroll-mt` plus a top offset
 *    driven by the same breakpoint scale keeps them flush at every size.
 *
 * 6. "CLEAR RESULTS" NAVIGATES, IT DOES NOT ONLY EMPTY. The spec pairs the two
 *    actions, and leaving the user on a page that has just been emptied is a dead
 *    end. It clears the store and returns to /convert, ready for a new batch.
 *    "← Convert more" and "Try the rest again" run the *same* reset, because the
 *    store is in memory: without it a client-side transition to /convert carries
 *    the finished batch across, files and "View results" button included.
 *
 * 7. THE ACTION BAR STACKS BELOW 640px, AND ONLY BELOW 640px. The developer's
 *    screenshot is 340x720, which is narrower than the usual 360 baseline, and
 *    at that width the ZIP label clipped. `sm:` restores the original single
 *    `h-16` row byte for byte, so the desktop composition is unchanged.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { EmptyState } from '@/components/camerlob/EmptyState';
import { FailedFilesList } from '@/components/camerlob/FailedFilesList';
import { ResultGrid } from '@/components/camerlob/ResultGrid';
import { ResultStats } from '@/components/camerlob/ResultStats';
import { buttonClasses, buttonMotion } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useConversionStore } from '@/store/conversionStore';
import { useZipDownload } from '@/hooks/useZipDownload';

const OUT = [0.16, 1, 0.3, 1] as const;
const PARTICLES = 10;

function ParticleBurst() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      {Array.from({ length: PARTICLES }, (_, index) => {
        // Evenly spread on a circle so the burst is radial, not a random spray.
        const angle = (index / PARTICLES) * Math.PI * 2;
        return (
          <motion.span
            key={index}
            className="absolute size-1 rounded-full bg-aqua-400"
            initial={{ opacity: 0.7, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: Math.cos(angle) * 120,
              y: Math.sin(angle) * 46,
              scale: 0.4,
            }}
            transition={{ duration: 0.8, ease: OUT, delay: 0.12 }}
          />
        );
      })}
    </div>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const zip = useZipDownload();

  const results = useConversionStore((state) => state.results);
  const failures = useConversionStore((state) => state.failures);
  const summary = useConversionStore((state) => state.summary);
  const clearOnPageLeave = useConversionStore((state) => state.clearOnPageLeave);

  const hasResults = results.length > 0 || failures.length > 0;
  const allSucceeded = hasResults && failures.length === 0 && summary !== null;

  /**
   * Leave for a fresh batch.
   *
   * The reset happens BEFORE the navigation, not on /convert's mount, so the
   * converter never renders one frame of the previous batch. A plain
   * `<Link href="/convert">` cannot do that — the store is in memory, so a
   * client-side transition carries the whole previous session across with it,
   * which is how a finished batch used to follow the user back to /convert
   * with its files and its "View results" button still showing.
   */
  const onConvertMore = () => {
    clearOnPageLeave();
    router.push('/convert');
  };

  const onClear = () => {
    // The same reset as `onConvertMore`, under the name the destructive button
    // carries. It keeps the user's mode preference; see `clearOnPageLeave`.
    clearOnPageLeave();
    router.push('/convert');
  };

  if (!hasResults || summary === null) {
    return (
      <div className="container-page measure-wide pt-28 md:pt-32">
        <span className="label-mono">{'// Result'}</span>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* ------------------------------------------------------- header ----- */}
      <header className="container-page measure-wide pb-8 pt-28 md:pt-32">
        <span className="label-mono">{'// Result'}</span>

        <div className="relative mt-4 inline-block">
          {allSucceeded ? <ParticleBurst /> : null}
          <motion.h1
            className="relative text-balance font-serif text-[2rem] leading-[1.05] tracking-[-0.02em] text-text-primary md:text-[3rem]"
            initial={
              reduceMotion || !allSucceeded ? false : { opacity: 0, clipPath: 'inset(0 100% 0 0)' }
            }
            animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: OUT }}
          >
            {allSucceeded ? (
              'All done.'
            ) : (
              <>
                <span className="text-aqua-400">{summary.succeeded}</span> of {summary.total} done.
              </>
            )}
          </motion.h1>
        </div>

        {/* `text-pretty` rather than `text-balance`: this is a two-line
            sentence, and even wrapping reads better than a balanced orphan. */}
        <p className="measure-prose mt-4 text-pretty text-base text-text-secondary">
          Your files are converted and ready to download.
        </p>

        <div className="mt-8">
          <ResultStats summary={summary} />
        </div>
      </header>

      {/* --------------------------------------------------- action bar ----- */}
      {/*
        TWO ROWS BELOW `sm`. At the 340px floor a 375px phone gets 16px of
        gutter on each side, and the ghost "Convert more" label, the trash icon
        and the aqua ZIP label cannot share one line without the primary action
        — the one control people arrived for — clipping. The row order is
        unchanged at every size: back link and destructive action above, the
        primary action below. `sm:` restores the single `h-16` row exactly as it
        was, so no desktop layout is touched.
      */}
      <div className="sticky top-0 z-20 border-y border-border-subtle bg-black/70 backdrop-blur-xl">
        <div className="container-page measure-wide flex flex-col gap-3 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
          <div className="flex w-full items-center justify-between sm:w-auto sm:gap-2">
            <button
              type="button"
              onClick={onConvertMore}
              className={cn(
                'inline-flex h-9 min-w-0 items-center gap-1.5 rounded-md px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary',
                'transition-colors duration-150 enabled:hover:text-aqua-400',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
              )}
            >
              <span aria-hidden="true">←</span>
              <span className="truncate">Convert more</span>
            </button>

            <button
              type="button"
              onClick={onClear}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary',
                'transition-colors duration-150 enabled:hover:text-error',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
              )}
            >
              <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Clear results</span>
              <span className="sr-only sm:hidden">Clear results</span>
            </button>
          </div>

          {/* Full width and 48px tall on mobile, inline and 44px from sm up. */}
          <button
            type="button"
            onClick={() => void zip.downloadAll()}
            disabled={!zip.canDownload}
            className={cn(
              buttonClasses({ variant: 'primary', size: 'sm' }),
              'h-12 w-full shrink-0 gap-2 px-4 sm:h-11 sm:w-auto sm:px-5'
            )}
          >
            <motion.span
              className="grid place-items-center"
              whileHover={reduceMotion ? undefined : { y: 2 }}
              transition={{ duration: 0.15, ease: OUT }}
            >
              <Archive aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </motion.span>
            <span className="truncate">
              {zip.isZipping ? `Zipping ${zip.percent}%` : 'Download all as ZIP'}
            </span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------- grid ----- */}
      <div className="container-page measure-wide pt-10">
        <ResultGrid results={results} />

        <FailedFilesList failures={failures} />

        {failures.length > 0 ? (
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onConvertMore}
              className={cn(buttonClasses({ variant: 'ghost', size: 'md' }), 'gap-2')}
            >
              <motion.span className="inline-flex items-center gap-2" {...buttonMotion}>
                <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.75} />
                Try the rest again
              </motion.span>
            </button>
            <p className="font-mono text-[11px] text-text-tertiary">
              {'// some formats need an engine that is not installed on this server.'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
