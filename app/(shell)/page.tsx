/**
 * app/(shell)/page.tsx
 * The Camerlob landing page: seven sections, one column of intent.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. LAYERS, NOT NEGATIVE Z-INDEX. AnimatedBackground renders a `fixed z-0`
 *    wrapper and everything else sits in a `relative z-10` wrapper. Nothing uses
 *    a negative z-index, so the aurora can never end up painted behind the root
 *    background. Because the background is fixed, its grain does not re-raster
 *    while the page scrolls.
 *
 * 2. THE HERO SPLITS 6/6 AT xl ONLY. Below 1280px the visual is removed from the
 *    document entirely — not scaled down, not opacity-faded — because a 500px
 *    iris competing with a 40px headline is worse than no iris at all. The copy
 *    column therefore owns the full measure on phone and tablet.
 *
 * 3. HEADLINE SIZES ARE THE SPEC'S, NOT THE TYPE SCALE'S. --text-display is 64px;
 *    the brief asks for 40 / 56 / 72. Tokens govern colour, spacing and radius.
 *    Display type follows the brief, because a hero that misses its stated size
 *    is a visible regression while a colour that misses its token is not.
 *
 * 4. THE DISPLAY FACE IS USED TWICE ONLY: the hero headline and the "Three
 *    steps" heading. Everything else is Geist Sans (served as Manrope).
 *    Instrument Serif ships a single 400 weight, which is why app/globals.css
 *    pins h1/h2 to 400 — asking for 500 would be a lie the browser cannot keep.
 *
 * 5. THE UNDERLINE DRAWS FROM THE INLINE-START EDGE with scaleX, on an 800ms
 *    delay behind a 600ms draw, so it lands after the headline has settled
 *    instead of competing with it.
 *
 * 6. MOTIONCONFIG LIVES IN THE SHELL LAYOUT, NOT HERE. reducedMotion="user" makes
 *    framer-motion skip transform animations across every page in the route
 *    group, so it belongs in app/(shell)/layout.tsx next to the chrome it wraps.
 *    It does not cover infinite rotation or setInterval cycling, so those
 *    components still call useReducedMotion() directly.
 *
 * 7. THE NAVBAR, FOOTER, AURORA AND <main> LANDMARK ARE NOT IN THIS FILE. They
 *    moved to app/(shell)/layout.tsx when /convert and /result joined the route
 *    group, so the three shell pages share one chrome implementation instead of
 *    each page mounting its own. Everything below is the landing page's own
 *    content, unchanged.
 */

'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import * as React from 'react';

import { ApertureVisual } from '@/components/camerlob/ApertureVisual';
import { FormatGrid } from '@/components/camerlob/FormatGrid';
import { HeroCTA } from '@/components/camerlob/HeroCTA';
import { StepRow } from '@/components/camerlob/StepRow';
import { TerminalWindow } from '@/components/camerlob/TerminalWindow';
import { buttonClasses, buttonMotion } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/* ------------------------------------------------------------------ helpers */

/**
 * A monospace section eyebrow whose hairline grows out to the right.
 * The rule is `scaleX`, not `width`, so it stays on the compositor.
 */
function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' });

  return (
    <div ref={ref} className={cn('flex items-center gap-4', className)}>
      <span className="label-mono shrink-0">{children}</span>
      <motion.span
        aria-hidden="true"
        className="h-px flex-1 origin-left bg-gradient-to-r from-aqua-500/50 to-transparent"
        initial={reduceMotion ? false : { scaleX: 0 }}
        animate={inView || reduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/** Fade-up on scroll: translateY(24px) -> 0 with opacity, staggered per child. */
function Reveal({
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
  const inView = useInView(ref, { once: true, margin: '-12% 0px -12% 0px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={inView || reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: reduceMotion ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

const STEPS = [
  {
    title: 'Pick your formats',
    description:
      'Choose a source and target from 40+ supported pairs. Two-way conversion works both directions.',
    illustration: 'pair' as const,
  },
  {
    title: 'Drop up to 20 files',
    description:
      'Drag and drop or click to browse. Files never leave your machine — everything happens locally.',
    illustration: 'drop' as const,
  },
  {
    title: 'Download single or ZIP',
    description:
      'Grab individual files, or download the whole batch as a single ZIP. No watermarks. No size limits.',
    illustration: 'download' as const,
  },
];

const PILLARS = [
  {
    label: 'Zero uploads',
    claim: 'Your files stay on your machine.',
    body: 'Period. Conversion runs in your browser.',
  },
  {
    label: 'No account',
    claim: 'No email. No login. No tracking.',
    body: 'Nothing to sign up for, ever.',
  },
  {
    label: 'No limits',
    claim: 'Convert 10 files or 10,000.',
    body: 'Free forever, with no watermarks.',
  },
];

/* --------------------------------------------------------------------- page */

export function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* ---------------------------------------------- 02 · HERO ----- */}
      <section className="relative flex min-h-svh flex-col justify-center pb-16 pt-28 md:pb-20 md:pt-32 xl:pt-36">
        <div className="container-page measure-wide">
          <div className="grid items-center gap-12 xl:grid-cols-12 xl:gap-8">
            {/* Copy, columns 1-6 */}
            <div className="xl:col-span-6">
              <Reveal>
                <span className="inline-flex items-center gap-2.5 rounded-full border border-aqua-500/25 bg-aqua-500/5 px-3 py-1.5">
                  <span aria-hidden="true" className="relative grid size-1.5 place-items-center">
                    <span className="size-1.5 rounded-full bg-aqua-400" />
                    {!reduceMotion ? (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-aqua-400"
                        animate={{ scale: [1, 2.4], opacity: [0.7, 0] }}
                        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
                      />
                    ) : null}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-aqua-400">
                    Local-first · No uploads · 40+ formats
                  </span>
                </span>
              </Reveal>

              {/* Headline: line one white, line two aqua with the drawn rule. */}
              <Reveal delay={0.06}>
                <h1 className="mt-8 font-serif text-[2.5rem] leading-[1.02] tracking-[-0.02em] text-text-primary md:text-[3.5rem] xl:text-[4.5rem]">
                  <span className="block">Convert any image. Any format.</span>
                  <span className="relative mt-1 inline-block text-aqua-400">
                    Free. Forever.
                    <motion.span
                      aria-hidden="true"
                      className="absolute -bottom-1 left-0 h-px w-full origin-left bg-gradient-to-r from-aqua-400 to-aqua-600"
                      initial={reduceMotion ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="measure-prose mt-6 text-base text-text-secondary md:text-lg">
                  Camerlob runs entirely on your machine. No signups, no uploads, no limits. Drop up
                  to 20 files, pick your format, and download instantly.
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <HeroCTA className="mt-10" />
              </Reveal>

              <Reveal delay={0.24}>
                <p className="mono-note mt-4">{'// No account. No telemetry. Runs offline.'}</p>
              </Reveal>
            </div>

            {/* Visual, columns 7-12. Present only at xl and up. */}
            <div className="hidden xl:col-span-6 xl:flex xl:justify-end xl:pr-6">
              <ApertureVisual />
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="container-page measure-wide mt-16 hidden md:flex md:justify-center xl:mt-0">
          <motion.span
            aria-hidden="true"
            className="text-aqua-500/70"
            animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        </div>
      </section>

      {/* ---------------------------------------- 03 · FORMAT GRID ---- */}
      <FormatGrid />

      {/* ------------------------------------- 04 · HOW IT WORKS ------ */}
      <section id="how-it-works" aria-labelledby="process-heading" className="section-y">
        <div className="container-page measure-wide">
          <Reveal>
            <SectionLabel>02 / The process</SectionLabel>
            <h2
              id="process-heading"
              className="mt-6 max-w-2xl font-serif text-[2rem] leading-tight tracking-[-0.02em] text-text-primary md:text-[2.5rem]"
            >
              Three steps. No accounts. No waiting.
            </h2>
          </Reveal>

          <div className="mt-14 md:mt-20">
            {STEPS.map((step, index) => (
              <StepRow
                key={step.title}
                step={index + 1}
                title={step.title}
                description={step.description}
                illustration={step.illustration}
                divider={index > 0}
                className={index === 0 ? undefined : 'mt-10 md:mt-14'}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------ 05 · PRIVACY ------ */}
      <section id="privacy" aria-labelledby="privacy-heading" className="section-y">
        <div className="container-page measure-wide">
          <Reveal>
            <SectionLabel>03 / Why Camerlob</SectionLabel>
            <h2
              id="privacy-heading"
              className="mt-6 max-w-xl text-3xl font-medium text-text-primary"
            >
              Built for people who don&rsquo;t trust the cloud.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-12 md:mt-20 md:grid-cols-12 md:gap-8">
            <Reveal className="md:col-span-5">
              <TerminalWindow />
            </Reveal>

            <div className="md:col-span-7 md:pl-6">
              {PILLARS.map((pillar, index) => (
                <Reveal key={pillar.label} delay={index * 0.06}>
                  <div className="border-b border-border-subtle py-7 first:pt-0">
                    <p className="label-mono-sm">{pillar.label}</p>
                    <p className="mt-3 text-xl font-semibold text-text-primary">{pillar.claim}</p>
                    <p className="mt-1.5 text-[15px] text-text-secondary">{pillar.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------- 06 · FINAL CTA ----- */}
      <section
        aria-labelledby="final-cta-heading"
        className="relative overflow-hidden bg-black-950"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua-500/10 blur-[120px]"
        />
        <div className="container-page measure-wide relative py-24 text-center md:py-32">
          <Reveal>
            <h2
              id="final-cta-heading"
              className="mx-auto max-w-3xl font-serif text-[2.5rem] leading-[1.05] tracking-[-0.02em] text-text-primary md:text-[3rem]"
            >
              Your images. Your machine. Your call.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base text-text-secondary">
              Convert your first batch in under 10 seconds.
            </p>
            <div className="mt-10 flex justify-center">
              {/* An anchor, not a button: this navigates to the converter. */}
              <motion.a
                href="/convert"
                className={buttonClasses({
                  variant: 'primary',
                  size: 'cta',
                  className: 'h-[52px] md:h-14',
                })}
                {...buttonMotion}
              >
                Start converting
                <span aria-hidden="true">&rarr;</span>
              </motion.a>
            </div>
            <p className="mt-6 font-mono text-xs text-text-tertiary">
              {'// No signup. No credit card. No nonsense.'}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}

export default LandingPage;
