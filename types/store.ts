/**
 * types/store.ts
 * Shape of the Zustand store in `store/convert-store.ts`. Kept in `types/` so
 * components can type selectors without importing the store implementation.
 */

import type { ConversionFailure, ConversionResult, ConversionSummary } from './conversion';
import type { QueuedFile } from './file';

/** Actions exposed by the convert store. */
export interface ConvertStore {
  // ---- Queue ----
  files: QueuedFile[];
  addFiles: (incoming: readonly File[]) => void;
  removeFile: (id: string) => void;
  clearQueue: () => void;

  // ---- Conversion control ----
  sourceFormat: string | null;
  targetFormat: string | null;
  setSourceFormat: (format: string | null) => void;
  setTargetFormat: (format: string | null) => void;

  // ---- Run state ----
  isConverting: boolean;
  progress: number;
  results: ConversionResult[];
  failures: ConversionFailure[];
  summary: ConversionSummary | null;
  startConversion: () => Promise<void>;
  resetResults: () => void;
}

/** Selector helpers with stable signatures, for `useStore(selector)`. */
export type ConvertStoreSelector<T> = (state: ConvertStore) => T;
