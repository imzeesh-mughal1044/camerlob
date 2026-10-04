/**
 * components/camerlob/EngineStatusPanel.tsx
 * The slim right-hand column on the converter: how the pipeline works, and which
 * engines this machine can actually run.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE THREE ROWS ARE STATIC COPY, NOT A TUTORIAL. They exist so a user who
 *    picked CR2 understands why a file might fail, at the moment they are looking
 *    at the picker. Nothing scrolls, nothing highlights itself, nothing moves.
 *
 * 2. THE STATUS DOT IS A COLOUR *AND* A LABEL *AND* A SHAPE. Green/aqua for
 *    ready, amber for degraded, muted grey for unreachable — each with a text
 *    label beside it, and the ready state additionally gets a soft pulse ring.
 *    Colour alone would fail 1.4.1 and would leave a colourblind user unable to
 *    tell "degraded" from "unreachable", which need different actions.
 *
 * 3. `aria-live="polite"` ON THE STATUS LINE ONLY. The probe resolves on mount
 *    and then once a minute, so this announces state changes without turning the
 *    panel into a chatterbox. That is the single most useful thing a screen
 *    reader user learns from this panel.
 *
 * 4. IT HIDES ITSELF BELOW 1280px. At tablet width the two-column converter is
 *    already tight, and a third column of prose would push the format grids below
 *    four columns. The information it carries is also on the /result page's
 *    failure block, so nothing is lost — it is just further away.
 *
 * 5. EVERY ENGINE THE SERVER REPORTS GETS A ROW, EVEN WHEN IT IS MISSING. A row
 *    that disappears when an engine is absent would make the panel look healthier
 *    the worse the machine got. `useEngineStatus` already fills the five
 *    canonical engines, so this component renders whatever it is handed, in
 *    order, with an explicit state per row.
 */

'use client';

import { RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import * as React from 'react';

import { ENGINE_LABELS } from '@/lib/constants/errors';
import { cn } from '@/lib/utils/cn';
import { useEngineStatus, type EngineState } from '@/hooks/useEngineStatus';
import type { EngineName } from '@/types/engine';

const ROWS = [
  { title: 'Add your files', detail: 'The format is read from the file’s bytes.' },
  { title: 'The server converts', detail: 'sharp, ImageMagick, LibRaw or Ghostscript.' },
  { title: 'Download the results', detail: 'One at a time, or all of them as a ZIP.' },
] as const;

const DOT: Record<EngineState, { className: string; label: string }> = {
  probing: { className: 'bg-text-disabled', label: 'Checking engines' },
  ready: { className: 'bg-success', label: 'Engines ready' },
  degraded: { className: 'bg-warning', label: 'Some engines missing — see setup' },
  unreachable: { className: 'bg-warning', label: 'Some engines missing — see setup' },
};

/** `HH:MM` in the viewer's locale, or `null` while no probe has succeeded. */
function checkedAtLabel(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function engineLabel(name: EngineName): string {
  return ENGINE_LABELS[name] ?? name;
}

export function EngineStatusPanel({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const status = useEngineStatus();
  const dot = DOT[status.state];
  const checked = checkedAtLabel(status.lastChecked);

  return (
    <aside aria-labelledby="engine-heading" className={cn('hidden xl:block', className)}>
      <h3 id="engine-heading" className="label-mono-sm">
        {'// How it works'}
      </h3>

      <ol className="mt-4 flex flex-col gap-4">
        {ROWS.map((row, index) => (
          <li key={row.title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-aqua-500/40 font-mono text-[10px] text-aqua-400"
            >
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold text-text-primary">{row.title}</span>
              <span className="text-xs leading-relaxed text-text-tertiary">{row.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-md border border-border-subtle bg-bg-secondary/60 p-3">
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em]"
        >
          <span className="relative grid size-2 shrink-0 place-items-center">
            <span className={cn('size-2 rounded-full', dot.className)} />
            {/* A single slow breath, so "ready" reads as alive without alarm. */}
            {status.state === 'ready' && !reduceMotion ? (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-success"
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
              />
            ) : null}
          </span>
          <span className={cn(status.state === 'ready' ? 'text-success' : 'text-warning')}>
            {dot.label}
          </span>
        </p>

        {status.note ? (
          <p className="mt-2 text-xs leading-relaxed text-text-tertiary">{status.note}</p>
        ) : null}

        {/* Per-engine rows: a colour + a label + an optional version, never
            colour alone. */}
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-border-subtle pt-3">
          {status.engines.map((engine) => (
            <li key={engine.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 rounded-full',
                    engine.available ? 'bg-success' : 'bg-text-disabled'
                  )}
                />
                <span className="font-mono text-[11px] text-text-secondary">
                  {engineLabel(engine.name)}
                </span>
              </span>
              <span
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.08em]',
                  engine.available ? 'text-success' : 'text-text-disabled'
                )}
              >
                {engine.available ? 'ready' : 'missing'}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <span className="mono-note">
            {checked ? `// checked ${checked}` : '// not checked yet'}
          </span>
          <button
            type="button"
            onClick={status.refresh}
            aria-label="Re-check engine availability"
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary',
              'transition-colors duration-150 ease-camerlob-out',
              'enabled:hover:text-aqua-400',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
            )}
          >
            <RefreshCw
              aria-hidden="true"
              className={cn(
                'size-3',
                status.state === 'probing' && !reduceMotion && 'animate-spin'
              )}
              strokeWidth={1.75}
            />
            Refresh
          </button>
        </div>
      </div>
    </aside>
  );
}
