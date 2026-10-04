/**
 * components/camerlob/FailedFilesList.tsx
 * The red-orange block below the grid: what failed, why, and what to do.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE ERROR CODE IS SHOWN. `E005` costs a user nothing to read and is the only
 *    thing that makes a bug report actionable, because there is no telemetry in
 *    this product — the console log plus a code is the entire diagnostic surface
 *    the TRD allows. The user-facing `message` never contains a path, a stack, or
 *    a binary name; the `detail` does, and stays out of the DOM entirely.
 *
 * 2. THE LEFT BORDER IS 3px, NOT A FULL BOX. A fully outlined error block at
 *    4% red reads as a warning banner competing with the page. A 3px left rule
 *    plus a hairline elsewhere marks the region without shouting, and it is the
 *    same left-border convention the toasts use, so "something went wrong" looks
 *    the same everywhere in the product.
 *
 * 3. RETRY IS PER FILE, AND IT IS TEXT. There is no batch retry: the files may
 *    have failed for different reasons, and re-running the whole batch to fix one
 *    is a worse default than making the user aim at the row they care about.
 *
 * 4. THE BLOCK IS `role="region"` WITH A LABELLED HEADING, not `role="alert"`.
 *    An alert would interrupt a screen reader mid-sentence the moment the page
 *    loads, which is hostile for content the user chose to navigate to. A labelled
 *    region is findable by heading and by landmark list, which is what someone
 *    scanning for "what went wrong" actually does.
 */

'use client';

import { AlertCircle, RotateCw } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import type { ConversionFailure } from '@/types/conversion';

export interface FailedFilesListProps {
  failures: readonly ConversionFailure[];
  onRetry?: (id: string) => void;
}

export function FailedFilesList({ failures, onRetry }: FailedFilesListProps) {
  if (failures.length === 0) return null;

  const headingId = 'failed-files-heading';

  return (
    <section
      aria-labelledby={headingId}
      className="mt-10 rounded-xl border border-l-[3px] border-error/20 border-l-error/55 bg-error/[0.04] py-6 pl-6 pr-6"
    >
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold text-error">
        <AlertCircle aria-hidden="true" className="size-5" strokeWidth={1.75} />
        {failures.length === 1 ? '1 file failed' : `${failures.length} files failed`}
      </h2>

      <ul role="list" className="mt-4 flex flex-col gap-3">
        {failures.map((failure) => (
          <li
            key={failure.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-error/10 pt-3 first:border-t-0 first:pt-0"
          >
            <span className="min-w-0 flex-1">
              <span
                className="block truncate font-mono text-sm text-text-primary"
                title={failure.originalName}
              >
                {failure.originalName}
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-text-secondary">
                {failure.message}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
                {failure.code}
              </span>
              {onRetry ? (
                <button
                  type="button"
                  onClick={() => onRetry(failure.id)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-aqua-400',
                    'transition-colors duration-150 ease-camerlob-out',
                    'enabled:hover:bg-aqua-500/10',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
                  )}
                >
                  <RotateCw aria-hidden="true" className="size-3" strokeWidth={1.75} />
                  Retry
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
