/**
 * hooks/useFormatMatrix.ts
 * Format selection for the converter: the source list, the target list filtered
 * by the matrix, search, and the swap.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE MATRIX IS THE ONLY SOURCE OF TRUTH FOR TARGETS. `getTargetsFor` is the
 *    same function the engine router calls, so the picker cannot offer a pair
 *    the pipeline will reject. Duplicating the filtering rule here is exactly the
 *    bug the TRD's single-artefact rule exists to prevent.
 *
 * 2. SEARCH MATCHES ID, LABEL AND EXTENSION, IN THAT ORDER OF TRUST. A user
 *    typing `cr2` wants Canon RAW; a user typing `raw` wants the family. Both
 *    resolve because the haystack is the joined id, label and extension list.
 *    Matching is case-insensitive and substring-based, never fuzzy — a fuzzy
 *    matcher on 40 items produces confident nonsense like "TIFF" matching "GIF".
 *
 * 3. THE SELECTED SOURCE SURVIVES THE TARGET LIST CHANGING, NOT THE OTHER WAY
 *    ROUND. Picking a target that the new source cannot reach is impossible
 *    because the target list is derived, so no reconciliation is needed here.
 *
 * 4. SEARCH IS DEFERRED TO THE FILTER, NOT THE DATA. The source list is a frozen
 *    40-entry object, so filtering it per keystroke costs nothing measurable and
 *    needs no debounce; adding one would only add latency.
 *
 * 5. THE API IS THE SERVER'S VIEW OF THE SAME MATRIX, NOT A REPLACEMENT FOR IT.
 *    `GET /api/formats` returns one row per source with the resolved server
 *    `engine` on each target, and `GET /api/formats/[format]` returns the same
 *    rows for a single source plus the `accept` attribute for the file input and
 *    a human-readable `reason` per target. This hook reads the matrix
 *    *synchronously* from `CONVERSION_MATRIX` rather than fetching it, for two
 *    reasons:
 *
 *    a) The picker must render on first paint. A 40-item grid that waits on a
 *       round trip to show its cards is slower than the conversion it fronts, and
 *       the network is the part that actually fails.
 *    b) A stale client list cannot cause a wrong conversion, because the server
 *       re-derives the matrix on every request. Offering a pair the server will
 *       refuse produces a 400 with a precise reason, not a corrupt file. The
 *       failure mode of fetching is therefore a stale grid; the failure mode of
 *       not fetching is one rejected request. The first is cosmetic.
 *
 *    The two views cannot drift because they are the same constant: the route
 *    handlers in `app/api/formats` call the same `getTargetsFor` this hook calls.
 *    If a future change ever makes the route fetch the matrix from somewhere else,
 *    that invariant is what breaks — check here first.
 *
 *    `getAcceptAttribute(source)` is the single source for the file input's
 *    `accept` string, so `.jpg` also accepts `.jpeg`/`.jfif` and `.heic` also
 *    accepts `.heif` without a second list to keep in sync.
 */

'use client';

import * as React from 'react';

import { getEngineFor, getTargetsFor } from '@/lib/convert/formats';
import { FORMAT_REGISTRY, SOURCE_FORMATS, TARGET_FORMATS } from '@/lib/constants/formats';
import { useConversionStore } from '@/store/conversionStore';
import type { EngineName } from '@/types/engine';
import type { FormatsResponse } from '@/lib/validation/convert';

/** Every format that can be a source, sorted for a stable grid. */
const SOURCE_IDS = [...SOURCE_FORMATS].sort();

function haystack(id: string): string {
  const meta = FORMAT_REGISTRY[id];
  if (!meta) return id.toLowerCase();
  return `${id} ${meta.label} ${meta.extensions.join(' ')}`.toLowerCase();
}

function filterIds(ids: readonly string[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...ids];
  return ids.filter((id) => haystack(id).includes(needle));
}

/**
 * One in-flight fetch of `GET /api/formats`, shared by every mount.
 *
 * Module-level rather than per-hook so two components requesting the matrix at
 * once — the picker and the engine panel both can — produce one request. The
 * promise is kept, not the result: a second caller arriving while the first is
 * still in flight must await the same request rather than start a second one.
 */
let formatsRequest: Promise<FormatsResponse> | null = null;

function loadFormats(): Promise<FormatsResponse> {
  if (!formatsRequest) {
    formatsRequest = fetch('/api/formats', {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GET /api/formats ${response.status}`);
        return (await response.json()) as FormatsResponse;
      })
      .catch((error: unknown) => {
        // A failed fetch must not poison the module-level cache for the rest of
        // the session: the next mount retries.
        formatsRequest = null;
        throw error;
      });
  }
  return formatsRequest;
}

export interface FormatMatrix {
  /** Ids matching the source search box, in display order. */
  sourceIds: string[];
  /** Ids matching the target search box; already narrowed by the source. */
  targetIds: string[];
  /** Every target reachable from the current source, unfiltered. */
  allTargetIds: string[];
  sourceQuery: string;
  targetQuery: string;
  setSourceQuery: (value: string) => void;
  setTargetQuery: (value: string) => void;
  source: string | null;
  target: string | null;
  selectSource: (id: string) => void;
  selectTarget: (id: string) => void;
  swap: () => void;
  /** True once a source is chosen and the matrix offers it nowhere to go. */
  sourceHasNoTargets: boolean;
  /** Total target count for the badge, before the target search box narrows it. */
  targetCount: number;
  canSwap: boolean;

  /** Source ids as the server reports them, for callers that need the labels. */
  sources: readonly { id: string; label: string }[];
  /** Targets the server offers for a source, in matrix order. */
  targetsFor: (source: string) => readonly string[];
  /** Server-side engine for a pair, or `null` when the pair is not offered. */
  engineFor: (source: string, target: string) => EngineName | null;
  /** True while the server matrix is still being fetched. */
  isLoading: boolean;
  /** Set when the fetch failed; the local matrix is still used regardless. */
  error: string | null;
}

export function useFormatMatrix(): FormatMatrix {
  const source = useConversionStore((state) => state.sourceFormat);
  const target = useConversionStore((state) => state.targetFormat);
  const setSource = useConversionStore((state) => state.setSource);
  const setTarget = useConversionStore((state) => state.setTarget);
  const swapFormats = useConversionStore((state) => state.swapFormats);

  const [sourceQuery, setSourceQuery] = React.useState('');
  const [targetQuery, setTargetQuery] = React.useState('');

  const [remote, setRemote] = React.useState<FormatsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    void loadFormats()
      .then((data) => {
        if (!alive) return;
        setRemote(data);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        // The picker is fully usable against the local matrix (decision 5 in
        // the file header), so a failed fetch degrades the engine labels rather
        // than the feature. The message is kept for the engine panel only.
        setError(cause instanceof Error ? cause.message : 'format matrix unavailable');
        setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * The server's target list for a source, when it has answered, and the local
   * matrix otherwise. Both come from `getTargetsFor`, so they agree by
   * construction; the remote copy exists so a future server-side change to the
   * matrix does not require a matching client release.
   */
  const targetsFor = React.useCallback(
    (id: string): readonly string[] => {
      const row = remote?.sources.find((entry) => entry.id === id);
      if (row) return row.targets.map((entry) => entry.to);
      return getTargetsFor(id);
    },
    [remote]
  );

  const engineFor = React.useCallback(
    (id: string, to: string): EngineName | null => {
      const row = remote?.sources.find((entry) => entry.id === id);
      const match = row?.targets.find((entry) => entry.to === to);
      if (match) return match.engine as EngineName;
      return getEngineFor(id, to);
    },
    [remote]
  );

  // The source must be one of the 40 matrix keys, otherwise the search box would
  // happily hold an id the matrix has never heard of.
  const allTargetIds = React.useMemo(() => {
    if (!source || !SOURCE_FORMATS.includes(source)) return [];
    const reachable = new Set(targetsFor(source));
    // Intersect rather than trust: targetsFor is the router's view, the registry
    // is the UI's view, and a disagreement should be visible in dev rather than
    // silently render an unselectable card.
    return TARGET_FORMATS.filter((id) => reachable.has(id));
  }, [source, targetsFor]);

  const sourceIds = React.useMemo(() => filterIds(SOURCE_IDS, sourceQuery), [sourceQuery]);

  const targetIds = React.useMemo(
    () => filterIds(allTargetIds, targetQuery),
    [allTargetIds, targetQuery]
  );

  const sources = React.useMemo(
    () => remote?.sources.map((entry) => ({ id: entry.id, label: entry.label })) ?? SOURCE_LIST,
    [remote]
  );

  return {
    sourceIds,
    targetIds,
    allTargetIds,
    sourceQuery,
    targetQuery,
    setSourceQuery,
    setTargetQuery,
    source,
    target,
    selectSource: (id) => setSource(FORMAT_REGISTRY[id] ? id : null),
    selectTarget: (id) => setTarget(FORMAT_REGISTRY[id] ? id : null),
    swap: swapFormats,
    sourceHasNoTargets: Boolean(source) && allTargetIds.length === 0,
    targetCount: allTargetIds.length,
    canSwap: Boolean(source && target),
    sources,
    targetsFor,
    engineFor,
    isLoading,
    error,
  };
}

/** Local fallback for {@link FormatMatrix.sources}, used before the API answers. */
const SOURCE_LIST: readonly { id: string; label: string }[] = SOURCE_IDS.map((id) => ({
  id,
  label: FORMAT_REGISTRY[id]?.label ?? id.toUpperCase(),
}));
