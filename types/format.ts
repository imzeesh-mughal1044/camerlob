/**
 * types/format.ts
 * Format vocabulary for Camerlob. This module contains types only: no runtime
 * values, no imports from `lib/`. The concrete format identifiers live in
 * `lib/constants/formats.ts` and the `ImageFormat` union is derived there.
 */

/** Broad families a format can belong to, used for grouping in the picker. */
export type FormatCategory = 'raster' | 'layered' | 'vector' | 'raw' | 'document';

/** MIME type string, narrowed to the shapes browsers actually emit. */
export type MimeType = string;

/** Which execution environment can service a conversion for this format. */
export type FormatEngineSupport = 'client' | 'server' | 'both';

/**
 * Everything the UI needs to render one format. Served to the browser by
 * `GET /api/formats` as a serialisable object.
 */
export interface ImageFormatMeta {
  /** Lowercase canonical identifier, also the matrix key. */
  readonly id: string;
  /** Uppercase display name, e.g. `JPEG`. */
  readonly label: string;
  /** File extensions including the leading dot, e.g. `['.jpg', '.jpeg']`. */
  readonly extensions: readonly string[];
  /** Output MIME type. */
  readonly mimeType: MimeType;
  readonly category: FormatCategory;
  /** Whether a browser can decode and encode this format on its own. */
  readonly clientSupport: boolean;
  /** Native engine required when the client path cannot service the pair. */
  readonly requiredEngine: string | null;
  /** True for RAW, layered and vector families: decodable, never encodable. */
  readonly sourceOnly: boolean;
  /** One-line explanation shown on the format card tooltip. */
  readonly description: string;
}

/** A format that has been narrowed to a valid matrix key. */
export interface KnownFormat {
  readonly id: string;
  readonly label: string;
}

/** Serialisable shape returned by `GET /api/formats`. */
export interface ConversionMatrixResponse {
  readonly sources: readonly KnownFormat[];
  readonly targets: readonly KnownFormat[];
  readonly pairs: Readonly<Record<string, readonly string[]>>;
  readonly engines: Readonly<Record<string, string>>;
}
