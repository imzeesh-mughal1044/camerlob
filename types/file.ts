/**
 * types/file.ts
 * Queue-side file model. `QueuedFile` is what the UI renders; `File` is the
 * browser object the engines consume. They are deliberately separate so the
 * UI never has to reason about mutable `File` internals.
 */

/** Validation state of a queued file. */
export type FileStatus = 'valid' | 'rejected' | 'converting' | 'converted' | 'failed';

/** One entry in the upload queue. */
export interface QueuedFile {
  readonly id: string;
  /** Name as supplied by the operating system. */
  readonly name: string;
  /** Lowercase extension without the dot. */
  readonly extension: string;
  readonly size: number;
  readonly mimeType: string;
  /** The underlying browser File, held for the duration of the batch. */
  readonly file: File;
  status: FileStatus;
  /** Rejection reason when `status` is `rejected`. */
  readonly reason: string | null;
  /** Object URL for the preview thumbnail; must be revoked on removal. */
  readonly thumbnailUrl: string | null;
}

/** Result of validating one file against the limits and magic bytes. */
export interface FileValidation {
  readonly valid: boolean;
  /** E002 when oversized, E003 when the batch is full, E004 on bad signature. */
  readonly code: string | null;
  readonly reason: string | null;
}
