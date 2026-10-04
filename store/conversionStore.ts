/**
 * store/conversionStore.ts
 * The single source of truth for one conversion session, in memory only.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. `'use client'` ON A NON-COMPONENT MODULE IS DELIBERATE. The store holds
 *    `File` and `Blob` handles and its module state is process-global. If a
 *    Server Component ever imported it, that module would be evaluated on the
 *    server and the queue would be shared by every concurrent request. The
 *    directive makes that a build error instead of a privacy incident.
 *
 * 2. IN-MEMORY, NEVER PERSISTED. `persist` is deliberately absent. A File or
 *    Blob cannot be structurally cloned into localStorage, so persistence would
 *    either drop the payloads or serialise hundreds of megabytes of base64. The
 *    session survives client-side navigation between /convert and /result
 *    because both read the same live store, and a full reload starts clean —
 *    which is the honest behaviour for a tool that promises nothing is stored.
 *
 * 3. THIS STORE OWNS EVERY OBJECT URL. A thumbnail URL is minted when a file is
 *    added and an output URL when a result lands; both are revoked in the same
 *    store action that drops the reference. Nothing outside this file calls
 *    URL.revokeObjectURL, so there is exactly one place to audit for leaks.
 *
 * 4. THE STEP INDEX IS NOT STORED. It is derived from `sourceFormat`,
 *    `targetFormat` and `files.length` at render time. Storing it as well would
 *    allow the two to disagree — clearing the queue would have to remember to
 *    walk the step back.
 *
 * 5. A REAL `ConversionJob` IS THE QUEUE ITEM, not a lighter UI shape.
 *    {@link FileQueueItem} extends the scaffolded type rather than replacing it,
 *    so the queue is the same object the engine router consumes. Three fields
 *    are added on top: the format the *bytes* turned out to be, the result once
 *    the server returns one, and the failure code once it does not. All three
 *    are facts about the file rather than about the UI, which is why they live
 *    here instead of in component state.
 *
 * 6. THE QUEUE IS NOT DROPPED ON COMPLETION. An earlier version cleared the
 *    queue inside `finishBatch` to avoid pinning twenty decoded thumbnails. That
 *    is right for memory and wrong for the user: the file cards are where a
 *    per-file size delta and a per-file engine name are shown, and a queue that
 *    vanishes on the tick the batch ends means those two facts are never seen.
 *    Thumbnails are still revoked immediately — they are the only part that pins
 *    decoded bitmaps — and `clearOnPageLeave` drops the items when the user
 *    actually leaves for /result.
 *
 * 7. SWITCHING MODES NEVER SILENTLY KEEPS AN INVALID PAIR. Both modes clear the
 *    target when it is unreachable from the source. Offering a pair the router
 *    will reject with E001 is worse than asking the user to choose again.
 */

'use client';

import { create } from 'zustand';

import { engineKindFor, formatsEquivalent, getTargetsFor } from '@/lib/convert/formats';
import { MAX_FILES } from '@/lib/constants/limits';
import type {
  ConversionFailure,
  ConversionJob,
  ConversionPair,
  ConversionResult,
  ConversionSummary,
} from '@/types/conversion';
import type { ConversionOptions, EngineName } from '@/types/engine';

/** The three tracker stages, as an ordinal so it can be compared and stepped. */
export type ConvertStep = 1 | 2 | 3;

/**
 * How the source format is decided.
 *
 * `auto` (the default) reads the bytes of the first accepted file and fills the
 * source in from them. `manual` waits for the user to pick a source, and then
 * holds every file to it.
 */
export type ConversionMode = 'auto' | 'manual';

/**
 * A successful conversion, as the result page needs it.
 *
 * Extends the scaffolded `ConversionResult` with the one field the API added and
 * the UI shows: the short engine *name* the server reported (`sharp`,
 * `imagemagick`, …). The base type's `engine` field holds the `EngineKind` the
 * rest of the app speaks, so both vocabularies are present and neither has to be
 * reconstructed at render time.
 */
export interface FileConversionResult extends ConversionResult {
  /** Short engine name from the API, shown in the result card's engine pill. */
  readonly engineName: EngineName;
}

/** A per-file failure, as the file card renders it. */
export interface FileQueueError {
  /** Stable code E001-E010. */
  readonly code: string;
  /** User-safe sentence. */
  readonly message: string;
  /** Developer-facing detail. Written to the console, never rendered. */
  readonly detail: string;
}

/** One unit of work in the batch queue. */
export interface FileQueueItem extends Omit<ConversionJob, 'pair'> {
  /**
   * The pair this file will be converted with.
   *
   * Re-declared mutable (the base `ConversionJob.pair` is `readonly`) because
   * the queue is homogeneous and every item is re-stamped when either end of the
   * pair changes — see `restamp` below.
   */
  pair: ConversionPair;
  /**
   * What the bytes actually are, from `detectFormatFromFile`.
   *
   * Separate from the pair on purpose: in auto mode this is the evidence the
   * source was chosen from, and in manual mode a file whose detected format
   * disagrees with the chosen source is rejected rather than queued, so a
   * non-null value here is always consistent with `pair.source`.
   */
  detectedFormat: string | null;
  /** Set once the server has produced output for this file. */
  result: FileConversionResult | null;
  /** Set when this file failed, either locally or server-side. */
  error: FileQueueError | null;
}

/**
 * Encoder settings for v1. Every field is a product decision rather than a user
 * preference, so they live here instead of in a settings surface the brief does
 * not ask for. `quality: 82` is the point where AVIF and WEBP stop being visibly
 * worse than the source at 1:1.
 */
const CONVERSION_OPTIONS: ConversionOptions = {
  quality: 82,
  preserveAlpha: true,
  stripMetadata: false,
};

/** What a caller passes to add one file to the queue. */
export interface NewQueueFile {
  readonly file: File;
  /** Result of client-side detection. `null` when the bytes were unreadable. */
  readonly detectedFormat: string | null;
}

export interface ConversionStore {
  mode: ConversionMode;
  sourceFormat: string | null;
  targetFormat: string | null;
  files: FileQueueItem[];
  results: FileConversionResult[];
  failures: ConversionFailure[];
  summary: ConversionSummary | null;
  /** True from the first tick of a batch until navigation to /result. */
  isConverting: boolean;

  setMode: (mode: ConversionMode) => void;
  setSource: (id: string | null) => void;
  setTarget: (id: string | null) => void;
  /** Reverse the pair. A no-op unless both ends are chosen, because a swap
   *  needs two values to trade and would otherwise invent a format. */
  swapFormats: () => void;

  /** Add one file. Returns its id, or `null` when the batch is already full. */
  addFile: (input: NewQueueFile) => string | null;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  patchFile: (
    id: string,
    patch: Partial<Pick<FileQueueItem, 'status' | 'progress' | 'engine' | 'result' | 'error'>>
  ) => void;

  startBatch: () => void;
  finishBatch: (
    results: FileConversionResult[],
    failures: ConversionFailure[],
    summary: ConversionSummary
  ) => void;
  clearResults: () => void;

  /**
   * Release everything and return to a pristine converter.
   *
   * Called when the user leaves /result for /convert. This is the boundary
   * where the previous batch's `File` handles are worth dropping: on the result
   * page they are behind a download link, on the converter they are twenty
   * blobs competing with whatever the user picks next.
   *
   * THE MODE PREFERENCE SURVIVES. Auto-detect vs Manual is a setting the user
   * made, not state produced by a batch, so resetting it here would silently
   * undo their choice every time they returned for another batch. Everything
   * that *is* batch state — files, formats, results, failures, summary and the
   * in-flight flag — goes back to its initial value.
   */
  clearOnPageLeave: () => void;
}

const INITIAL = {
  mode: 'auto' as ConversionMode,
  sourceFormat: null,
  targetFormat: null,
  files: [] as FileQueueItem[],
  results: [] as FileConversionResult[],
  failures: [] as ConversionFailure[],
  summary: null as ConversionSummary | null,
  isConverting: false,
};

function mintId(prefix: string): string {
  // `crypto.randomUUID` is present in every browser that can run the WASM and
  // Canvas engines. The Math.random branch keeps older WebKit honest.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function revokeAll(files: readonly FileQueueItem[]): void {
  for (const item of files) {
    if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
  }
}

function revokeAllResults(results: readonly ConversionResult[]): void {
  for (const result of results) {
    if (result.outputUrl) URL.revokeObjectURL(result.outputUrl);
  }
}

/**
 * Rewrite the `pair` on every queued file.
 *
 * The queue is homogeneous — one batch, one pair — so when either end of the
 * pair moves, every stamped job is stale. Re-stamping here is what lets the
 * upload hook read `job.pair` without asking the store a second time, and it is
 * why `pair` is not `readonly` on {@link FileQueueItem}.
 */
function restamp(
  files: readonly FileQueueItem[],
  source: string | null,
  target: string | null
): FileQueueItem[] {
  const pair = { source: source ?? '', target: target ?? '' };
  return files.map((item) => ({ ...item, pair }));
}

/** True when `target` is reachable from `source` in the conversion matrix. */
function pairIsValid(source: string | null, target: string | null): boolean {
  if (!source || !target) return false;
  return getTargetsFor(source).includes(target);
}

export const useConversionStore = create<ConversionStore>()((set, get) => ({
  ...INITIAL,

  /**
   * Switch between the two ways of choosing a source format.
   *
   * BIDIRECTIONAL, AND THE QUEUE SURVIVES BOTH DIRECTIONS. Auto -> manual and
   * manual -> auto both re-derive the source from the bytes of the first queued
   * file, which is the one piece of evidence both modes can act on: it is what
   * Auto mode inferred, and it is the only defensible Manual source for files the
   * user has already admitted. The target is kept only when it is still reachable
   * from that source (decision 7), and every file is re-stamped. A queue that is
   * not homogeneous is dropped rather than converted under a source only some of
   * its files match.
   *
   * `mode` IS PART OF THE SAME `set()` PAYLOAD AND MUST STAY THERE. A previous
   * revision derived the formats, cleaned up the queue, and then called `set()`
   * with `{ sourceFormat, targetFormat, files }` — `mode` was missing from the
   * payload. Every consumer (`FormatPicker`, `ConvertActionBar`, `useFileQueue`)
   * reads `state.mode` through a zustand selector and so re-rendered correctly;
   * they simply re-rendered with the *same* value, because nothing had written
   * the new one. The segmented control therefore kept the old option lit and the
   * panel never swapped, from either direction and for any queue. Keeping the
   * write in this one atomic `set()` also means the mode and the queue state it
   * justifies are published together, so no later cleanup can clobber it.
   */
  setMode: (mode) => {
    const { mode: current, files, targetFormat } = get();
    // Idempotent, and cheap: a second click on the already-active option must not
    // re-stamp the queue or revoke thumbnails the user is still looking at.
    if (current === mode) return;

    const derived = files[0]?.detectedFormat ?? null;
    const homogeneous =
      derived !== null &&
      files.every(
        (item) => item.detectedFormat !== null && formatsEquivalent(item.detectedFormat, derived)
      );
    // No files at all is homogeneous by definition: there is nothing to conflict.
    const kept = files.length === 0 || homogeneous ? files : [];
    if (kept.length !== files.length) revokeAll(files);

    const source = kept.length > 0 ? derived : null;
    const target = pairIsValid(source, targetFormat) ? targetFormat : null;
    // `mode` first so the published payload reads in the order the user acted,
    // and so removing it again is visibly the first thing that breaks the toggle.
    set({ mode, sourceFormat: source, targetFormat: target, files: restamp(kept, source, target) });
  },

  setSource: (id) => {
    const { sourceFormat, targetFormat, files } = get();
    if (id === sourceFormat) return;
    // Changing the source invalidates the target: the old target may not be
    // reachable from the new source, and silently keeping it would offer a pair
    // the matrix rejects.
    const target = pairIsValid(id, targetFormat) ? targetFormat : null;
    set({ sourceFormat: id, targetFormat: target, files: restamp(files, id, target) });
  },

  setTarget: (id) => {
    const { sourceFormat, files } = get();
    set({ targetFormat: id, files: restamp(files, sourceFormat, id) });
  },

  swapFormats: () => {
    const { sourceFormat, targetFormat, files } = get();
    if (!sourceFormat || !targetFormat) return;
    set({
      sourceFormat: targetFormat,
      targetFormat: sourceFormat,
      files: restamp(files, targetFormat, sourceFormat),
    });
  },

  addFile: ({ file, detectedFormat }) => {
    const { files, sourceFormat, targetFormat, mode } = get();

    // The 20-file ceiling is enforced here as well as in `useFileQueue`. Two
    // callers, one rule: the hook's check gives the user a toast naming the
    // files it refused, and this one makes the invariant true of the store even
    // if a future caller skips the hook.
    if (files.length >= MAX_FILES) return null;

    // In auto mode the first file decides the source. Doing it here rather than
    // in the hook means a caller that adds a file programmatically gets the
    // same inference, and the target picker appears without a second trip
    // through React state.
    const inferredSource = mode === 'auto' && sourceFormat === null ? detectedFormat : sourceFormat;

    const item: FileQueueItem = {
      id: mintId('file'),
      pair: { source: inferredSource ?? '', target: targetFormat ?? '' },
      file,
      detectedFormat,
      options: CONVERSION_OPTIONS,
      status: 'queued',
      progress: 0,
      engine: null,
      thumbnailUrl: URL.createObjectURL(file),
      result: null,
      error: null,
    };

    set({ files: [...files, item], sourceFormat: inferredSource });
    return item.id;
  },

  removeFile: (id) => {
    const { files } = get();
    const victim = files.find((item) => item.id === id);
    if (!victim) return;
    if (victim.thumbnailUrl) URL.revokeObjectURL(victim.thumbnailUrl);
    set({ files: files.filter((item) => item.id !== id) });
  },

  clearFiles: () => {
    revokeAll(get().files);
    set({ files: [] });
  },

  patchFile: (id, patch) => {
    set({
      files: get().files.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  },

  startBatch: () => {
    const { files } = get();
    set({
      isConverting: true,
      files: files.map((item) => ({ ...item, status: 'converting', progress: 0 })),
    });
  },

  finishBatch: (results, failures, summary) => {
    const { files } = get();

    // Thumbnails go now (decision 6): they are the only part of a queue item
    // that pins a decoded bitmap, and the results carry their own preview URLs.
    revokeAll(files);

    // Each file is matched to its outcome by name. The server disambiguates
    // duplicate *output* names but echoes the original, and the client sent one
    // batch with one pair, so original name is a unique key within a batch
    // unless the user dropped the same file twice — in which case both copies
    // get the same outcome, which is the honest answer.
    const outcomeFor = (name: string): FileConversionResult | undefined =>
      results.find((result) => result.originalName === name);
    const failureFor = (name: string): ConversionFailure | undefined =>
      failures.find((failure) => failure.originalName === name);

    set({
      isConverting: false,
      results,
      failures,
      summary,
      files: files.map((item) => {
        const result = outcomeFor(item.file.name);
        if (result) {
          return {
            ...item,
            status: 'done',
            progress: 100,
            engine: engineKindFor(result.engineName),
            result,
            error: null,
          };
        }
        const failure = failureFor(item.file.name);
        if (!failure) return item;
        return {
          ...item,
          status: 'failed',
          progress: 100,
          engine: null,
          result: null,
          error: {
            code: failure.code,
            message: failure.message,
            detail: failure.detail,
          },
        };
      }),
    });
  },

  clearResults: () => {
    revokeAllResults(get().results);
    set({ results: [], failures: [], summary: null });
  },

  clearOnPageLeave: () => {
    const { files, results, mode } = get();
    revokeAll(files);
    revokeAllResults(results);
    set({ ...INITIAL, mode });
  },
}));

/* ------------------------------------------------------------------ selectors */

/** Formats, if the pair is complete and the queue can accept more files. */
export function canQueueFiles(state: ConversionStore): boolean {
  return Boolean(state.sourceFormat && state.targetFormat) && state.files.length < MAX_FILES;
}

export function canConvert(state: ConversionStore): boolean {
  return (
    Boolean(state.sourceFormat && state.targetFormat) &&
    state.files.length > 0 &&
    !state.isConverting
  );
}

/**
 * The active tracker stage, derived rather than stored.
 * 1 until both formats are chosen, 2 until a file lands, 3 once the user commits.
 */
export function deriveStep(
  state: Pick<ConversionStore, 'sourceFormat' | 'targetFormat' | 'files' | 'isConverting'>
): ConvertStep {
  if (!state.sourceFormat || !state.targetFormat) return 1;
  if (state.files.length === 0) return 2;
  return state.isConverting ? 3 : 2;
}
