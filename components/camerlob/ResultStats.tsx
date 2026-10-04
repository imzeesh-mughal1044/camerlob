/**
 * components/camerlob/ResultStats.tsx
 * The four numbers under the result headline: count, time, output size, delta.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE REDUCTION IS ONLY SHOWN WHEN THERE IS A REDUCTION. The brief says so
 *    explicitly, and it is the right call: a "−0%" or "+4%" tile is noise that
 *    trains people to ignore the row. With the current placeholder every file is
 *    a passthrough, so this tile legitimately does not render — and the remaining
 *    three still form a complete row, because the grid is `auto-fit` rather than a
 *    fixed four columns that would leave a hole.
 *
 * 2. THE REDUCTION IS A DERIVED NUMBER FROM THE REAL BYTES, NOT A STORED ONE. It
 *    is computed from the same `sourceSize`/`outputSize` the download will produce,
 *    so it cannot drift from what the user gets.
 *
 * 3. A `<dl>` WITH `<dt>`/`<dd>`, NOT A ROW OF SPANS. This is genuinely a set of
 *    labelled values, and the description-list semantics announce "Total time:
 *    8.4 seconds" instead of reading four orphaned numbers.
 *
 * 4. TABULAR NUMBERS THROUGHOUT. `font-mono` with `tabular-nums` means a
 *    4-digit count does not shift the label beside it when the value changes, and
 *    the row stays on the same optical grid as the rest of the page.
 */

'use client';

import { ArrowDownRight } from 'lucide-react';
import * as React from 'react';

import { formatBytes } from '@/lib/utils/file-size';
import { cn } from '@/lib/utils/cn';
import type { ConversionSummary } from '@/types/conversion';

export interface ResultStatsProps {
  summary: ConversionSummary;
}

interface StatProps {
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'positive';
  icon?: React.ReactNode;
}

function Stat({ label, value, tone = 'default', icon }: StatProps) {
  return (
    // ONE LINE, NOT ONE BOX, ON MOBILE. At the 340px floor a two-column grid
    // left each stat roughly 148px of card minus 32px of padding, and
    // "Output size" clipped its own value. Stacking to a single column and
    // turning each stat on its side — label left, value right — makes the row
    // three compact lines instead of three tall boxes. `sm:flex-col` restores
    // the tile shape from the breakpoint up, so desktop is untouched.
    <div className="flex flex-row items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-secondary/60 px-4 py-3 sm:flex-col sm:items-start sm:gap-1">
      <dt className="label-mono-sm text-text-tertiary">{label}</dt>
      <dd
        className={cn(
          'flex items-center gap-1.5 font-mono text-lg tabular-nums',
          tone === 'accent' && 'text-aqua-400',
          tone === 'positive' && 'text-success',
          tone === 'default' && 'text-text-primary'
        )}
      >
        {icon}
        {value}
      </dd>
    </div>
  );
}

export function ResultStats({ summary }: ResultStatsProps) {
  const reduction =
    summary.totalOutputBytes > 0
      ? Math.round((1 - summary.totalOutputBytes / summary.totalInputBytes) * 100)
      : 0;
  const hasReduction = reduction > 0;

  return (
    // `grid-cols-1 sm:grid-cols-3` — the old `grid-cols-2` base crammed three
    // stats into two columns of about 148px at the 340px floor, which is what
    // made the values clip. See the note on `Stat` for the on-side layout.
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Stat label="Converted" value={`${summary.succeeded} / ${summary.total}`} tone="accent" />
      <Stat label="Total time" value={`${(summary.durationMs / 1000).toFixed(1)}s`} />
      <Stat label="Output size" value={formatBytes(summary.totalOutputBytes)} />
      {/* Decision 1: absent rather than zero when nothing was saved. */}
      {hasReduction ? (
        <Stat
          label="Size reduction"
          value={`−${reduction}%`}
          tone="positive"
          icon={<ArrowDownRight aria-hidden="true" className="size-4" strokeWidth={2} />}
        />
      ) : null}
    </dl>
  );
}
