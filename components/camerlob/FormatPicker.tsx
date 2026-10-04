/**
 * components/camerlob/FormatPicker.tsx
 * Step 1 of the converter: pick a source, pick a target, optionally swap them.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE SELECTABLE CARD IS NOT THE LANDING PAGE'S FormatCard, ON PURPOSE.
 *    That component renders an <li> and its own header says why: "nothing is
 *    selectable here, the real picker lives in the converter". Reusing it here
 *    would have produced a grid of things that look like controls, cannot be
 *    focused, and do nothing on Enter. PickerCard below is a real <button> in a
 *    real <li>, inheriting the landing card's exact visual language — 56/64px
 *    height, 8px radius, 4px corner tick, aqua gradient when selected, 2px hover
 *    lift, the same easing — so the two read as one system while only one of them
 *    is actually operable.
 *
 * 2. ROLED AS A GRID, NAVIGATED WITH ARROWS. The two format lists are
 *    `role="grid"` with `aria-rowcount`/`aria-colcount`, because a 4x10 grid of
 *    buttons is 40 tab stops otherwise. Roving focus via arrow keys with a Home/End
 *    shortcut keeps it to one stop, and the roving `tabIndex` is what makes Tab
 *    move past the whole grid rather than through it. The search input sits before
 *    the grid in DOM order, so tabbing in lands on search, then the grid.
 *
 * 3. THE TARGET PANEL IS NOT A SECOND INDEPENDENT PICKER. It is derived from the
 *    source through the same `getTargetsFor` the engine router calls, so the UI
 *    cannot offer a pair the pipeline will reject with E001.
 *
 * 4. THE SECTION TITLE UNDERLINE DRAWS ONLY ONCE THE PAIR IS COMPLETE. A rule
 *    that appears the moment the section mounts is decoration; a rule that appears
 *    when the step actually completes is a signal. It fills with scaleX like every
 *    other rule in the product.
 *
 * 5. THE SWAP CROSSFADES THE PANELS, NOT THE ICON. FormatSwapButton owns the icon
 *    rotation; the panel content swaps under `AnimatePresence` keyed on the source
 *    id with a 150ms opacity crossfade and a 6px rise. Both panels stay mounted
 *    during the swap so the layout does not jump.
 *
 * 6. THE EMPTY TARGET STATE IS AN INSTRUCTION, NOT AN ERROR. "// SELECT A SOURCE
 *    FORMAT FIRST" with a faded iris tells the user what to do next; an empty box
 *    tells them nothing.
 */

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Aperture, Search } from 'lucide-react';
import * as React from 'react';

import { FormatSwapButton } from '@/components/camerlob/FormatSwapButton';
import { getFormatMeta } from '@/lib/constants/formats';
import { cn } from '@/lib/utils/cn';
import { useFormatMatrix } from '@/hooks/useFormatMatrix';
import { useConversionStore } from '@/store/conversionStore';
import type { ConversionMode } from '@/store/conversionStore';

const OUT = [0.16, 1, 0.3, 1] as const;
const COLUMNS = 4;

interface ModeControlProps {
  mode: ConversionMode;
  onChange: (mode: ConversionMode) => void;
}

/**
 * Auto-detect / Manual selector.
 *
 * A radiogroup rather than two toggle buttons: the two values are mutually
 * exclusive states of one setting, and a screen reader should announce "Auto
 * detect, radio, checked 1 of 2" rather than two unrelated pressed buttons.
 */
function ModeControl({ mode, onChange }: ModeControlProps) {
  const options: readonly { value: ConversionMode; label: string; hint: string }[] = [
    { value: 'auto', label: 'Auto-detect', hint: 'Read the source format from the first file.' },
    { value: 'manual', label: 'Manual', hint: 'Choose the source format yourself.' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="How the source format is chosen"
      className="inline-flex shrink-0 rounded-md border border-border-subtle bg-bg-secondary p-0.5"
    >
      {options.map((option) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-[5px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em]',
              'transition-colors duration-150 ease-camerlob-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400',
              active
                ? 'bg-gradient-aqua text-text-on-accent'
                : 'text-text-tertiary enabled:hover:text-text-primary'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface AutoSourcePanelProps {
  /** The source format the first file resolved to, or `null` while waiting. */
  sourceFormat: string | null;
}

/**
 * The Auto-mode stand-in for the source grid.
 *
 * Auto mode deliberately has no source picker: the format comes from the bytes.
 * Rendering a disabled grid would suggest a choice that does not exist, so this
 * panel states the rule and then reports the detection once it lands.
 */
function AutoSourcePanel({ sourceFormat }: AutoSourcePanelProps) {
  const meta = sourceFormat ? getFormatMeta(sourceFormat) : null;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-mono-sm">Source</span>
        <span className="font-mono text-[11px] tabular-nums text-text-disabled">
          {meta ? meta.label : '—'}
        </span>
      </div>

      <div className="mt-3 flex min-h-[176px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border-subtle bg-bg-secondary/40 px-6 text-center">
        <Aperture
          aria-hidden="true"
          className={cn('size-7', meta ? 'text-aqua-400' : 'text-aqua-500/25')}
          strokeWidth={1.25}
        />
        {meta ? (
          <>
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-aqua-400">
              {meta.label} detected
            </p>
            <p className="max-w-[36ch] text-xs text-text-tertiary">{meta.description}</p>
          </>
        ) : (
          <>
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-text-tertiary">
              {'// Waiting for a file'}
            </p>
            <p className="max-w-[36ch] text-xs text-text-tertiary">
              Add a file below and its bytes set the source format. Everything you add must match
              it.
            </p>
          </>
        )}
      </div>

      <p className="mono-note mt-3 truncate" aria-live="polite">
        {meta ? (
          <>
            {'// source detected as '}
            <span className="text-aqua-400">{meta.label}</span>
          </>
        ) : (
          '// source is read from the first file'
        )}
      </p>
    </div>
  );
}

interface PickerCardProps {
  id: string;
  selected: boolean;
  index: number;
  onSelect: (id: string) => void;
}

/** One selectable format. Inherits the landing FormatCard's treatment. */
function PickerCard({ id, selected, index, onSelect }: PickerCardProps) {
  const reduceMotion = useReducedMotion();
  const meta = getFormatMeta(id);

  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
      transition={{
        duration: 0.15,
        ease: OUT,
        delay: reduceMotion ? 0 : Math.min(index, 8) * 0.015,
      }}
      className="group relative"
    >
      <button
        type="button"
        // Roving tabindex: exactly one card in the grid is in the tab order.
        tabIndex={selected ? 0 : -1}
        aria-pressed={selected}
        title={meta.description}
        data-format-cell={id}
        onClick={() => onSelect(id)}
        className={cn(
          'relative grid h-14 w-full place-items-center overflow-hidden rounded-md border md:h-16',
          'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-camerlob-out',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400',
          selected
            ? 'scale-105 border-transparent bg-gradient-aqua text-text-on-accent shadow-glow-md'
            : [
                'border-border-subtle bg-bg-secondary text-text-secondary',
                'enabled:hover:-translate-y-0.5 enabled:hover:border-aqua-500/40 enabled:hover:bg-bg-tertiary enabled:hover:text-aqua-400 enabled:hover:shadow-glow-sm',
              ]
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-1 top-1 size-2 origin-top-left scale-0 border-l-2 border-t-2 transition-transform duration-200 ease-camerlob-out',
            'group-enabled:hover:scale-100',
            selected ? 'border-text-on-accent' : 'border-aqua-500'
          )}
        />
        <span className="font-mono text-xs uppercase tracking-[0.08em]">{meta.label}</span>
      </button>
    </motion.li>
  );
}

interface SearchFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount: number;
}

function SearchField({ id, value, onChange, placeholder, resultCount }: SearchFieldProps) {
  const inputId = `${id}-search`;
  const statusId = `${id}-status`;

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
        strokeWidth={1.75}
      />
      <input
        id={inputId}
        type="search"
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-describedby={statusId}
        className={cn(
          'h-11 w-full rounded-md border border-border-subtle bg-bg-secondary pl-9 pr-3',
          'font-mono text-sm text-text-primary placeholder:text-text-disabled',
          'transition-[border-color,box-shadow] duration-200 ease-camerlob-out',
          'focus-visible:border-aqua-500 focus-visible:shadow-glow-sm focus-visible:outline-none',
          '[&::-webkit-search-cancel-button]:appearance-none'
        )}
      />
      {/* Announced on every keystroke so the filtered count is not visual-only. */}
      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {`${resultCount} format${resultCount === 1 ? '' : 's'} available`}
      </span>
    </div>
  );
}

interface PanelProps {
  role: 'source' | 'target';
  label: string;
  ids: readonly string[];
  selected: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  emptyLabel?: string;
  count: number;
}

function FormatPanel({
  role,
  label,
  ids,
  selected,
  query,
  onQueryChange,
  onSelect,
  emptyLabel,
  count,
}: PanelProps) {
  const gridRef = React.useRef<HTMLUListElement>(null);

  /**
   * Arrow-key roving focus. Implemented by querying the rendered buttons rather
   * than threading refs through every card, so the card stays a pure presentational
   * component and the grid owns its own keyboard model.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    const cells = Array.from(
      gridRef.current?.querySelectorAll<HTMLButtonElement>('[data-format-cell]') ?? []
    );
    if (cells.length === 0) return;

    const current = cells.indexOf(document.activeElement as HTMLButtonElement);
    const delta =
      event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowLeft'
          ? -1
          : event.key === 'ArrowDown'
            ? COLUMNS
            : event.key === 'ArrowUp'
              ? -COLUMNS
              : 0;

    let next: number;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = cells.length - 1;
    else if (current === -1) next = 0;
    else next = Math.min(cells.length - 1, Math.max(0, current + delta));

    event.preventDefault();
    cells.forEach((cell, index) => {
      cell.tabIndex = index === next ? 0 : -1;
    });
    cells[next]?.focus();
  };

  const selectedMeta = selected ? getFormatMeta(selected) : null;
  const isEmpty = ids.length === 0;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-mono-sm">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-text-disabled">
          {selectedMeta ? selectedMeta.label : '—'}
        </span>
      </div>

      <div className="mt-3">
        <SearchField
          id={role}
          value={query}
          onChange={onQueryChange}
          placeholder={`Search ${role === 'source' ? 'sources' : 'targets'}`}
          resultCount={count}
        />
      </div>

      <div className="mt-4 min-h-[132px]">
        {isEmpty ? (
          <div className="flex min-h-[132px] flex-col items-center justify-center gap-3 rounded-md border border-border-subtle bg-bg-secondary/40 text-center">
            <Aperture aria-hidden="true" className="size-7 text-aqua-500/25" strokeWidth={1.25} />
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
              {emptyLabel ?? '// No matches'}
            </span>
          </div>
        ) : (
          <ul
            ref={gridRef}
            role="grid"
            aria-label={`${label} formats`}
            aria-rowcount={Math.ceil(ids.length / COLUMNS)}
            aria-colcount={COLUMNS}
            onKeyDown={onKeyDown}
            className="grid grid-cols-3 gap-2 md:grid-cols-4"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {ids.map((id, index) => (
                <PickerCard
                  key={id}
                  id={id}
                  index={index}
                  selected={selected === id}
                  onSelect={onSelect}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* "Or type" readout: the selected format, so the choice is confirmable
          without hunting for the highlighted card. */}
      <p className="mono-note mt-3 truncate" aria-live="polite">
        {selectedMeta ? (
          <>
            {'// '}
            <span className="text-aqua-400">{selectedMeta.label}</span>
            {selectedMeta.sourceOnly ? ' · source only' : ''}
          </>
        ) : (
          '// or type to filter'
        )}
      </p>
    </div>
  );
}

export function FormatPicker() {
  const reduceMotion = useReducedMotion();
  const matrix = useFormatMatrix();
  const mode = useConversionStore((state) => state.mode);
  const setMode = useConversionStore((state) => state.setMode);
  const complete = Boolean(matrix.source && matrix.target);

  return (
    <section aria-labelledby="formats-heading" className="relative">
      <div className="flex flex-wrap items-center gap-4">
        <h2 id="formats-heading" className="shrink-0 font-serif text-2xl text-text-primary">
          Formats
        </h2>
        <ModeControl mode={mode} onChange={setMode} />
        {/* Decision 4: the rule appears when the step completes, not on mount. */}
        <span className="relative h-px flex-1 overflow-hidden">
          <span aria-hidden="true" className="absolute inset-0 bg-border-subtle" />
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 origin-left bg-gradient-to-r from-aqua-500 to-aqua-300"
            initial={false}
            animate={{ scaleX: complete ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: OUT }}
          />
        </span>
        {complete ? (
          <span className="label-mono-sm shrink-0 text-success">{'// pair ready'}</span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:gap-6">
        {mode === 'manual' ? (
          <FormatPanel
            role="source"
            label="Source"
            ids={matrix.sourceIds}
            selected={matrix.source}
            query={matrix.sourceQuery}
            onQueryChange={matrix.setSourceQuery}
            onSelect={matrix.selectSource}
            count={matrix.sourceIds.length}
          />
        ) : (
          <AutoSourcePanel sourceFormat={matrix.source} />
        )}

        <div className="flex items-center justify-center lg:pt-[104px]">
          {mode === 'manual' ? (
            <FormatSwapButton onSwap={matrix.swap} disabled={!matrix.canSwap} />
          ) : (
            // Auto mode has nothing to swap: the source is not a choice.
            <span aria-hidden="true" className="hidden lg:block lg:w-9" />
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${mode}-${matrix.source ?? 'unset'}`}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: OUT }}
            className="min-w-0"
          >
            {mode === 'auto' && !matrix.source ? (
              <div className="flex min-w-0 flex-col">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="label-mono-sm">Target</span>
                  <span className="font-mono text-[11px] tabular-nums text-text-disabled">—</span>
                </div>
                <div className="mt-3 flex min-h-[176px] flex-col items-center justify-center gap-3 rounded-md border border-border-subtle bg-bg-secondary/40 text-center">
                  <Aperture
                    aria-hidden="true"
                    className="size-7 text-aqua-500/25"
                    strokeWidth={1.25}
                  />
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                    {'// Add a file to choose a target'}
                  </span>
                </div>
              </div>
            ) : (
              <FormatPanel
                role="target"
                label="Target"
                ids={matrix.targetIds}
                selected={matrix.target}
                query={matrix.targetQuery}
                onQueryChange={matrix.setTargetQuery}
                onSelect={matrix.selectTarget}
                count={matrix.targetIds.length}
                emptyLabel={
                  matrix.source
                    ? matrix.sourceHasNoTargets
                      ? '// No targets for this format'
                      : '// No matches'
                    : '// Select a source format first'
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* An inline warning rather than a toast: it sits next to the control that
          caused it and must survive until the user picks a different source. */}
      {matrix.sourceHasNoTargets ? (
        <p role="status" className="mt-4 font-mono text-[11px] text-warning">
          {'// warning: '}
          {getFormatMeta(matrix.source ?? '').label} can only be read, not written. Choose another
          source.
        </p>
      ) : null}
    </section>
  );
}
