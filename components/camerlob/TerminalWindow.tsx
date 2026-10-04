/**
 * components/camerlob/TerminalWindow.tsx
 * Section 03's proof point: a fake CLI session that types itself out on scroll.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. THE "TYPING" IS A PER-CHARACTER STAGGER, NOT A TIMER. Each line is split
 *    into spans revealed by one parent motion.div with an increasing delay per
 *    character. This is cheaper than a setInterval, cannot desynchronise from
 *    the render loop, and — decisively — it collapses to a single instant reveal
 *    under prefers-reduced-motion, because the delay is simply not applied.
 *
 * 2. THE COPY BUTTON IS REAL. The command is copied from a constant, not scraped
 *    from the DOM, so the clipboard payload is always valid even if the styling
 *    changes. Feedback is a tooltip plus an aria-live announcement, because a
 *    tooltip alone is invisible to a screen reader. The 2s revert is cleared on
 *    unmount.
 *
 * 3. THE WINDOW IS DECORATIVE-ISH BUT NOT FAKE. It is a <figure> with a
 *    figcaption-like header of three inert dots, `aria-hidden` on the dots, and
 *    the transcript exposed as real text so it is readable by assistive tech and
 *    selectable by the mouse.
 *
 * 4. CHECK MARKS ARE TEXT, NOT EMOJI. The brief's transcript uses a tick; a
 *    literal glyph would depend on system font coverage. A styled span keeps the
 *    mark crisp and on-brand in aqua.
 */

'use client';

import { Check, Copy } from 'lucide-react';
import * as React from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils/cn';

/** The command shown in the prompt. Also the clipboard payload. */
const COMMAND = 'camerlob convert ./photos/*.CR2 --to jpg';

interface Line {
  readonly text: string;
  readonly kind: 'command' | 'success' | 'muted';
  /** Per-character delay, in seconds, so the lines type in sequence. */
  readonly start: number;
}

const LINES: readonly Line[] = [
  { text: `$ ${COMMAND}`, kind: 'command', start: 0 },
  { text: '✓ 20 files converted in 8.4s', kind: 'success', start: 0.55 },
  { text: '✓ 0 bytes uploaded', kind: 'success', start: 1.05 },
  { text: '✓ 0 accounts required', kind: 'success', start: 1.5 },
];

/** Seconds per character. Slow enough to read, fast enough not to drag. */
const SECONDS_PER_CHAR = 0.018;
const RESET_MS = 2000;

export function TerminalWindow({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px -20% 0px' });
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), RESET_MS);
    } catch {
      // Clipboard access can be denied; the tooltip simply never confirms.
      setCopied(false);
    }
  };

  const reveal = inView || reduceMotion;

  return (
    <figure
      ref={ref}
      className={cn(
        'overflow-hidden rounded-lg border border-border-subtle bg-black-950 shadow-glow-sm',
        className
      )}
    >
      {/* Title bar */}
      <figcaption className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-aqua-500/25" />
          <span className="size-2.5 rounded-full bg-aqua-500/25" />
          <span className="size-2.5 rounded-full bg-aqua-500/25" />
        </span>
        <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
          zsh — camerlob
        </span>

        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Command copied to clipboard' : 'Copy command to clipboard'}
          className={cn(
            'relative ml-auto grid size-8 place-items-center rounded-md',
            'text-text-tertiary transition-colors duration-150 ease-camerlob-out',
            'hover:bg-aqua-500/10 hover:text-aqua-400',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
          )}
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4 text-aqua-400" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? (
            <span className="absolute -top-9 right-0 rounded-sm border border-aqua-500/40 bg-black-900 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-aqua-400">
              copied
            </span>
          ) : null}
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? 'Command copied to clipboard' : ''}
        </span>
      </figcaption>

      {/* Transcript */}
      <div className="space-y-2 p-5 font-mono text-[13px] leading-relaxed md:p-6 md:text-sm">
        {LINES.map((line) => {
          let charIndex = 0;
          return (
            <p
              key={line.text}
              className={cn(
                'flex flex-wrap',
                line.kind === 'command' && 'text-text-primary',
                line.kind === 'success' && 'text-aqua-400',
                line.kind === 'muted' && 'text-text-tertiary'
              )}
            >
              {[...line.text].map((char, i) => {
                const delay = line.start + charIndex * SECONDS_PER_CHAR;
                charIndex += 1;
                return (
                  <motion.span
                    key={`${char}-${i}`}
                    aria-hidden="true"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={reveal ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.01, delay: reduceMotion ? 0 : delay }}
                  >
                    {char === ' ' ? '\u00a0' : char}
                  </motion.span>
                );
              })}
              {/* One accessible copy of the line for screen readers. */}
              <span className="sr-only">{line.text}</span>
            </p>
          );
        })}
      </div>
    </figure>
  );
}
