/**
 * components/camerlob/FormatGrid.tsx
 * Section 03: the "Forty formats" wall, with a live filter.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. EXACTLY 40 CARDS, NOT 41. The registry holds 41 entries, but `pdf` is an
 *    OUTPUT-only format — you cannot drop a PDF in and have it detected as a
 *    source. Rendering all 41 would leave a single orphan cell on the last row
 *    of an eight-column grid. `SOURCE_FORMATS` is the honest set, it is exactly
 *    40, and it divides cleanly into five rows of eight (and ten clean rows of
 *    four on mobile). The "40+" claim in the copy is therefore literally true.
 *
 * 2. THE GRID IS DERIVED, NEVER HAND-MAINTAINED. Cells come from
 *    `SOURCE_FORMATS` in lib/constants/formats, so a format added to the
 *    conversion matrix appears here automatically. Labels, descriptions and
 *    categories all come from `FORMAT_REGISTRY`.
 *
 * 3. THE SEARCH MATCHES ID, LABEL AND CATEGORY. Typing "raw" surfaces all 16 RAW
 *    formats; typing "ps" surfaces PSD, PSB and PS. The input is a real
 *    `type="search"` with a visually hidden <label>, and the result count is
 *    announced through a polite live region so the filter is not silent to
 *    screen readers.
 *
 * 4. THE 4s "SELECTED" CYCLE IS PRESENTATION ONLY. It stops entirely under
 *    prefers-reduced-motion, and it is cleared on unmount. Nothing here is
 *    clickable, so there is no state for a visitor to get stuck in.
 *
 * 5. COLUMNS AND GAPS MATCH THE RESPONSIVE TABLE: 4 columns at 8px below 768px,
 *    6 columns from 768px, 8 columns from 1280px at 12px. Cards are 56px tall on
 *    mobile and 64px from 768px up.
 */

'use client';

import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FormatCard } from '@/components/camerlob/FormatCard';
import { cn } from '@/lib/utils/cn';
import { FORMAT_REGISTRY, SOURCE_FORMATS } from '@/lib/constants/formats';

/** How often the showcase cycles its "selected" cell. */
const CYCLE_MS = 4000;

export function FormatGrid() {
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-10% 0px -10% 0px' });

  // The 40 source formats, in matrix order, with registry metadata attached.
  const formats = useMemo(
    () =>
      SOURCE_FORMATS.map((id) => {
        const meta = FORMAT_REGISTRY[id];
        return {
          id,
          label: meta?.label ?? id.toUpperCase(),
          description: meta?.description ?? '',
          category: meta?.category ?? 'raster',
        };
      }),
    []
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return formats;
    return formats.filter(
      (format) =>
        format.id.includes(needle) ||
        format.label.toLowerCase().includes(needle) ||
        format.category.includes(needle)
    );
  }, [formats, query]);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      const pool = visible.length > 0 ? visible : formats;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setSelectedId(pick ? pick.id : null);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion, visible, formats]);

  return (
    <section ref={sectionRef} id="formats" aria-labelledby="formats-heading" className="section-y">
      <div className="container-page">
        {/* Eyebrow. The hairline grows out to the right, matching SectionLabel
            in app/page.tsx; the label itself is duplicated rather than shared
            because SectionLabel is scoped to the page module. */}
        <div className="flex items-center gap-4">
          <p className="label-mono shrink-0">01 / Supported formats</p>
          <motion.span
            aria-hidden="true"
            className="h-px flex-1 origin-left bg-gradient-to-r from-aqua-500/50 to-transparent"
            initial={reduceMotion ? false : { scaleX: 0 }}
            animate={inView || reduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <h2 id="formats-heading" className="max-w-2xl text-3xl font-medium text-text-primary">
          Forty formats. Zero compromises.
        </h2>
        <p className="measure-prose-wide mt-4 text-base text-text-secondary">
          From iPhone HEIC to Canon RAW to Photoshop PSD. If it&rsquo;s an image, Camerlob speaks
          its language.
        </p>

        {/* Live filter */}
        <div className="mt-10 max-w-sm">
          <label htmlFor="format-search" className="sr-only">
            Filter supported formats
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
            />
            <input
              id="format-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search formats"
              autoComplete="off"
              className={cn(
                'h-11 w-full rounded-md border border-border-subtle bg-bg-secondary pl-9 pr-3',
                'text-sm text-text-primary placeholder:text-text-tertiary',
                'transition-colors duration-150 ease-camerlob-out',
                'hover:border-border-default',
                'focus-visible:border-aqua-500/60'
              )}
            />
          </div>
          <p aria-live="polite" className="mono-note mt-3">
            {visible.length} / {formats.length} formats
          </p>
        </div>

        {/* The wall */}
        <ul
          className={cn(
            'mt-6 grid',
            'grid-cols-4 gap-2',
            'md:grid-cols-6 md:gap-2.5',
            'xl:grid-cols-8 xl:gap-3'
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((format, index) => (
              <FormatCard
                key={format.id}
                id={format.id}
                label={format.label}
                description={format.description}
                selected={selectedId === format.id}
                index={index}
              />
            ))}
          </AnimatePresence>
        </ul>

        {visible.length === 0 ? (
          <p className="mt-8 text-sm text-text-tertiary">
            No format matches &ldquo;{query}&rdquo;. The converter still accepts 40 other types.
          </p>
        ) : null}
      </div>
    </section>
  );
}
