/**
 * app/(shell)/convert/page.tsx
 * The converter: formats on the left, the batch on the right, one button at the
 * bottom.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE LAYOUT IS TWO COLUMNS AT 768 AND UP, NOT AT 1280. The brief's responsive
 *    table asks for formats beside upload on tablet. Two columns of 4-up format
 *    cards plus an upload zone at 768px is 344px per column, which fits four 56px
 *    cards with gaps — tight but honest. Deferring to 1280 would give a tablet a
 *    2400px-tall single column and push the Convert button off the screen.
 *
 * 2. THE INFO PANEL IS THE THIRD COLUMN AND ONLY AT 1280. Three columns need real
 *    width; below that the panel is hidden and its content is not lost, because
 *    the same engine explanation appears on /result's failure block.
 *
 * 3. THE MOBILE SHEET IS PAID FOR WITH PADDING, NOT WITH OVERLAP. A fixed bottom
 *    bar over a scrolling list hides the last card and makes it unremovable, so
 *    the page reserves the sheet's height at the bottom of the document. This is
 *    the "scroll and fixed element coexistence" rule: a fixed bar is only
 *    acceptable if the content is inset to clear it.
 *
 * 4. THE HEADER SITS BELOW THE NAVBAR, NOT UNDER IT. pt-28 clears the 72px
 *    navbar plus breathing room; the step indicator is not sticky, because a
 *    second sticky element under a sticky navbar on a phone costs 128px of a
 *    760px viewport before any content appears.
 *
 * 5. THE UPLOAD ZONE IS IN THE RIGHT COLUMN AND IS NEVER REORDERED ON MOBILE.
 *    Formats come first in the DOM and on screen, which matches the step order
 *    the tracker advertises. Reordering them to put the drop zone first would put
 *    a target the user cannot yet fill at the top of the page.
 *
 * 6. THE STEP INDICATOR IS DERIVED, NOT STORED. `deriveStep` reads the live store
 *    so walking the user back — clearing the queue, changing the source — moves
 *    the tracker backwards on its own, with no effect to keep in sync.
 *
 * 7. ARRIVING ON THIS PAGE DISCARDS A COMPLETED BATCH. The store is in memory,
 *    so a transition back from /result arrives with the last session intact —
 *    including via the browser Back button, which runs no code of ours. The
 *    converter is the start of a batch, so a finished one is released on entry;
 *    see the effect in the component for the exact condition.
 */

'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { ConvertActionBar } from '@/components/camerlob/ConvertActionBar';
import { EngineStatusPanel } from '@/components/camerlob/EngineStatusPanel';
import { FileQueue } from '@/components/camerlob/FileQueue';
import { FormatPicker } from '@/components/camerlob/FormatPicker';
import { StepIndicator } from '@/components/camerlob/StepIndicator';
import { UploadZone } from '@/components/camerlob/UploadZone';
import { useConversionStore, deriveStep } from '@/store/conversionStore';

const OUT = [0.16, 1, 0.3, 1] as const;

function Section({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduceMotion || inView ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : delay, ease: OUT }}
    >
      {children}
    </motion.div>
  );
}

export default function ConvertPage() {
  const sourceFormat = useConversionStore((state) => state.sourceFormat);
  const targetFormat = useConversionStore((state) => state.targetFormat);
  const files = useConversionStore((state) => state.files);
  const isConverting = useConversionStore((state) => state.isConverting);

  const step = deriveStep({ sourceFormat, targetFormat, files, isConverting });

  /**
   * Entering /convert always means "start a batch", so a completed batch is
   * released on arrival.
   *
   * The store is in memory, which is why this is needed at all: a client-side
   * transition from /result — and the browser Back button, which is the same
   * transition — arrives with the previous session fully intact. /result's own
   * buttons clear before they navigate, but Back has no code to run, so without
   * this the user lands on a converter still holding the last batch: its files,
   * its source and target, and a "View results" button for output they have
   * already seen. `results`/`summary` are the signal that a batch actually
   * finished; an in-flight upload is left alone.
   *
   * `pathname` is the dependency rather than a bare mount, so a soft navigation
   * back into the route resets too. Read through `getState()` to avoid
   * subscribing: this must not re-run because the batch it just cleared changed.
   */
  const pathname = usePathname();
  React.useEffect(() => {
    const state = useConversionStore.getState();
    if (state.isConverting) return;
    if (state.results.length === 0 && state.summary === null) return;
    state.clearOnPageLeave();
  }, [pathname]);

  return (
    <div className="pb-32 md:pb-0">
      {/* ---------------------------------------------------------- header -- */}
      <header className="container-page measure-wide pb-10 pt-28 md:pt-32">
        <Section>
          <span className="label-mono">{'// Converter'}</span>
          <h1 className="mt-4 font-serif text-[2rem] leading-[1.05] tracking-[-0.02em] text-text-primary md:text-[3rem]">
            Choose. Drop. Done.
          </h1>
          <p className="measure-prose mt-4 text-base text-text-secondary">
            Pick a source and a target, or let the first file decide the source, then drop up to 20
            files and download the results.
          </p>
        </Section>

        <Section delay={0.08} className="mt-8">
          <StepIndicator active={step} />
        </Section>
      </header>

      {/* ------------------------------------------------------------ body -- */}
      <div className="container-page measure-wide pb-12">
        <div className="grid gap-10 md:grid-cols-2 md:gap-4 lg:gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
          {/* Formats */}
          <Section className="min-w-0">
            <FormatPicker />
          </Section>

          {/* Upload + queue */}
          <div className="min-w-0">
            <Section delay={0.08}>
              <div id="camerlob-upload-zone">
                <UploadZone />
              </div>
            </Section>

            <Section delay={0.16}>
              <FileQueue />
            </Section>
          </div>

          {/* Engine panel: third column, xl only. */}
          <EngineStatusPanel className="md:col-span-2 xl:col-span-1" />
        </div>
      </div>

      <ConvertActionBar />
    </div>
  );
}
