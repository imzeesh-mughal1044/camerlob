/**
 * types/conversion.ts
 * Job, result and failure shapes for a single conversion.
 */

import type { ConversionOptions, EngineKind, EngineName } from './engine';
import type { ErrorCode } from './error';

/** A validated source-to-target pair. */
export interface ConversionPair {
  readonly source: string;
  readonly target: string;
}

/** Lifecycle of one file within a batch. */
export type JobStatus = 'queued' | 'converting' | 'done' | 'failed' | 'skipped';

/** One unit of work in the batch queue. */
export interface ConversionJob {
  readonly id: string;
  readonly pair: ConversionPair;
  /** The source file. Held in memory for the duration of the job. */
  readonly file: File;
  readonly options: ConversionOptions;
  status: JobStatus;
  /** 0-100. Updated at most once per animation frame. */
  progress: number;
  /** Engine that actually serviced the job, resolved by the router. */
  engine: EngineKind | null;
  /** Object URL for the source thumbnail; revoked on removal. */
  readonly thumbnailUrl: string | null;
}

/** A successful conversion. */
export interface ConversionResult {
  readonly id: string;
  readonly pair: ConversionPair;
  /** Original filename, before sanitisation. */
  readonly originalName: string;
  /** Sanitised output filename, safe on every platform. */
  readonly outputName: string;
  readonly sourceSize: number;
  readonly outputSize: number;
  readonly outputMimeType: string;
  /** Engine that produced this blob. */
  readonly engine: EngineKind;
  /** True when the browser, not the server, performed the work. */
  readonly local: boolean;
  /** The converted bytes. Held until download or ZIP assembly. */
  readonly blob: Blob;
  /** Object URL for the output, revoked when the page unmounts. */
  readonly outputUrl: string;
  readonly durationMs: number;
}

/** A failed conversion, carrying the user-safe message and the private detail. */
export interface ConversionFailure {
  readonly id: string;
  readonly pair: ConversionPair;
  readonly originalName: string;
  /** Stable code E001-E009. */
  readonly code: string;
  /** Copy from `lib/constants/errors.ts`; safe to show in a toast. */
  readonly message: string;
  /** Stack, argv or engine stderr. Written to the console, never returned. */
  readonly detail: string;
}

/** Aggregate view of a finished batch, used by the result page. */
export interface ConversionSummary {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly totalInputBytes: number;
  readonly totalOutputBytes: number;
  readonly durationMs: number;
}

// ---------------------------------------------------------------------------
// Server-engine contracts.
//
// The shapes below are what `lib/convert/engines/` speaks. They are Buffer-based
// rather than File/Blob-based because the server path has already read the
// upload into memory by the time an engine is reached, and a Buffer avoids
// copying the payload a second time on the way to a native binary.
// ---------------------------------------------------------------------------

/** A format identifier known to the conversion matrix. */
export type Format = string;

/** One entry of a target list: the target format and the engine that writes it. */
export interface TargetFormat {
  readonly to: Format;
  readonly engine: EngineName;
}

/**
 * The engine route for one pair, resolved before any work starts.
 *
 * Note this is a different type from the `ConversionPlan` interface in
 * `lib/convert/router.ts`. That one is the legacy `EngineKind` plan and is kept
 * because the client engine still consumes it. This one is the server contract
 * the prompt specifies: short engine names, an explicit fallback chain, and a
 * flag the UI can read without inspecting the chain.
 */
export interface ConversionPlan {
  readonly source: Format;
  readonly target: Format;
  /** Engine attempted first. */
  readonly primaryEngine: EngineName;
  /** Engines attempted in order if the primary fails with a retryable code. */
  readonly fallbackEngines: readonly EngineName[];
  /** True when the chain contains no client engine and needs the server. */
  readonly requiresServer: boolean;
}

/** Everything an engine needs to service one file. */
export interface ConversionInput {
  /** The file's bytes. Engines must not mutate this buffer. */
  readonly buffer: Buffer;
  /**
   * Sanitised original filename, used only to derive a temp-file extension.
   * Never used to build a path outside {@link resolveTempDir}.
   */
  readonly filename: string;
  /**
   * The MIME type the client claimed. Recorded for diagnostics only and never
   * trusted: the route re-detects the real format from magic bytes before
   * calling an engine.
   */
  readonly declaredMime?: string;
}

/** What an engine returns on success. */
export interface ConversionOutput {
  readonly buffer: Buffer;
  readonly mime: string;
  readonly extension: string;
  readonly sizeBytes: number;
  readonly durationMs: number;
  readonly engineUsed: EngineName;
}

/**
 * A conversion failure in plain-data form.
 *
 * This is the *shape*, not the throwing class. `ConversionError` in
 * `lib/constants/errors.ts` is a class that additionally carries `detail`,
 * `retryable`, `escalatable` and `httpStatus`, and it is what engines throw.
 * This interface is what a caller receives after catching and reducing one, and
 * it is safe to serialise: there is no stack and no private detail.
 */
export interface ConversionErrorInfo {
  readonly code: ErrorCode;
  /** User-facing copy, safe to show in a toast. */
  readonly message: string;
  /** Engine that failed, when the failure is attributable to one. */
  readonly engine?: EngineName;
  /** Whether the router is permitted to try the next engine. */
  readonly retryable: boolean;
}

/** Per-file options accepted by every engine. Extends the shared options. */
export interface EngineConversionOptions extends ConversionOptions {
  /** Keep EXIF/ICC in the output. Default false for lossy targets. */
  readonly preserveMetadata?: boolean;
  /**
   * Keep every frame of an animated GIF. Default false, which flattens to the
   * first frame — a flattened animation is what a still-image target wants.
   */
  readonly preserveAnimation?: boolean;
  /** Encoder quality 1-100. Defaults per target: 90 for jpg/webp, 80 for avif. */
  readonly quality?: number;
  /**
   * Per-file timeout override, in milliseconds.
   *
   * A native adapter kills its child at this deadline and reports E007. The
   * router sets a longer default for RAW than for everything else, because
   * developing a 50MP sensor file is legitimately slow and must not be mistaken
   * for a hang.
   */
  readonly timeoutMs?: number;
  /**
   * The already-detected source format.
   *
   * The route re-detects the format from magic bytes before dispatching, so an
   * adapter that needs a filename extension should be handed that answer rather
   * than sniffing the same bytes a second time and risking a disagreement.
   */
  readonly sourceFormat?: string;
  /**
   * Rasterisation resolution, in DPI, for vector sources.
   *
   * EPS and PS carry no intrinsic pixel dimensions, so DPI is the only thing
   * that decides the size of the result. Ignored by the raster engines, whose
   * size comes from the source image.
   */
  readonly dpi?: number;
}
