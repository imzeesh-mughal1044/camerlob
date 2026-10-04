/**
 * lib/constants/limits.ts
 * Hard limits for batches and files. These are the code-level source of truth:
 * `NEXT_PUBLIC_MAX_FILES` and `NEXT_PUBLIC_MAX_FILE_SIZE_MB` mirror the client
 * values and a mismatch is a test failure (see tests/unit/formats.test.ts).
 *
 * Source: Documents/TRD.md sections 10.1 and 14.2, Documents/PRD.md section 8.
 */

/** Maximum files accepted in one batch. The 21st file is rejected with E003. */
export const MAX_FILES = 20;

/** Client-side per-file ceiling, in megabytes. Exceeding it fires E002. */
export const MAX_FILE_SIZE_MB = 100;

/** Server-side per-file ceiling, in megabytes, and the escalation threshold. */
export const SERVER_MAX_FILE_SIZE_MB = 50;

/** Aggregate request ceiling for a whole batch, in megabytes. */
export const MAX_BATCH_SIZE_MB = 500;

/** Width of the client conversion semaphore: files decoded in parallel. */
export const MAX_CONCURRENCY = 3;

/** Per-file spawn timeout for native engines, in milliseconds. Fires E007. */
export const ENGINE_TIMEOUT_MS = 60_000;

/** Interval at which stale temp directories are swept, in milliseconds. */
export const TEMP_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

/** Age at which a temp job directory is considered abandoned. */
export const TEMP_MAX_AGE_MS = 60 * 60 * 1000;

/** Default encoder quality for lossy targets, 1-100. */
export const DEFAULT_QUALITY = 90;

/** Longest edge, in pixels, used when an engine must downscale. */
export const DEFAULT_MAX_DIMENSION = 8192;

/** Byte constants, named so the limits above read as arithmetic. */
export const BYTES_PER_MB = 1024 * 1024;

/** Largest total payload the server will accept for one batch, in bytes. */
export const MAX_BATCH_SIZE_BYTES = MAX_BATCH_SIZE_MB * BYTES_PER_MB;

/** Largest single file the client will accept, in bytes. */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MB;

/** Largest single file the server will accept, in bytes. */
export const SERVER_MAX_FILE_SIZE_BYTES = SERVER_MAX_FILE_SIZE_MB * BYTES_PER_MB;

/** Debounce for the format search field, in milliseconds. */
export const FORMAT_SEARCH_DEBOUNCE_MS = 150;

/** How long `useEngineStatus` waits before re-probing, in milliseconds. */
export const ENGINE_STATUS_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Server-engine limits. Named with the `_SERVER` prefix so a reader can tell at
// a glance which side of the network a number governs; the unprefixed names
// above are the client-visible constants the UI already imports.
// ---------------------------------------------------------------------------

/** Client per-file ceiling, explicit alias for `MAX_FILE_SIZE_MB`. */
export const MAX_FILE_SIZE_MB_CLIENT = MAX_FILE_SIZE_MB;

/** Server per-file ceiling, in megabytes. Mirrors `SERVER_MAX_FILE_SIZE_MB`. */
export const MAX_FILE_SIZE_MB_SERVER = SERVER_MAX_FILE_SIZE_MB;

/** Aggregate batch ceiling, in megabytes. Mirrors `MAX_BATCH_SIZE_MB`. */
export const MAX_TOTAL_BATCH_MB = MAX_BATCH_SIZE_MB;

/**
 * Timeout for RAW development, in milliseconds.
 *
 * RAW is four times the raster budget on purpose: `dcraw_emu` demosaics every
 * pixel of a 40-megapixel sensor, which is an order of magnitude more work than
 * re-encoding a decoded bitmap. Reusing the 60s raster timeout here would fail
 * large NEF and ARW files that are merely slow rather than hung.
 */
export const ENGINE_TIMEOUT_RAW_MS = 120_000;

/** How long `GET /api/health` may be cached, in seconds. */
export const HEALTH_CACHE_SECONDS = 60;

/** The same window in milliseconds, for `Date.now()` comparisons. */
export const HEALTH_CACHE_MS = HEALTH_CACHE_SECONDS * 1000;

/**
 * Ceiling on input pixels, matching the TRD's decompression-bomb guard.
 *
 * 268MP is roughly a 20k x 13.4k frame. A file that decodes to more than this is
 * treated as hostile rather than merely large, and fails fast with E004 instead
 * of exhausting the heap. sharp's own default is lower; raising it this far is
 * deliberate so legitimate large scans still work.
 */
export const MAX_INPUT_PIXELS = 268_402_689;
