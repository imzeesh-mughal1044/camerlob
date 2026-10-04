/**
 * types/api.ts
 * Request and response contracts for the three route handlers. These types are
 * the only thing `components/` and `hooks/` are allowed to assume about the API.
 */

import type { ConversionFailure, ConversionPair, ConversionResult } from './conversion';
import type { HealthResponse } from './engine';

/** Multipart field names for `POST /api/convert`. */
export const CONVERT_FIELD_FILES = 'files';
export const CONVERT_FIELD_TARGET = 'target';

/** Request body shape of `POST /api/convert` (multipart/form-data). */
export interface ConvertRequest {
  /** 1 to 20 entries, each a binary file part. */
  readonly files: readonly File[];
  /** Target format identifier; must exist in the conversion matrix. */
  readonly target: string;
}

/** Response body of a successful `POST /api/convert`. */
export interface ConvertResponse {
  readonly ok: true;
  readonly results: readonly SerialisedConversionResult[];
  readonly failed: readonly SerialisedFailure[];
  readonly durationMs: number;
}

/** Response body of a rejected `POST /api/convert`. */
export interface ConvertErrorResponse {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
  readonly failed: readonly SerialisedFailure[];
}

/**
 * `ConversionResult` as it crosses the network: the `blob` field is replaced by
 * a data URL, so a client never has to deal with binary in JSON.
 */
export interface SerialisedConversionResult
  extends Omit<ConversionResult, 'blob' | 'outputUrl' | 'local'> {
  readonly local: boolean;
  /** `data:<mime>;base64,...` */
  readonly dataUrl: string;
  /** Object URL created client-side from `dataUrl` after decoding. */
  readonly outputUrl: string;
}

/** `ConversionFailure` with the private `detail` field removed. */
export interface SerialisedFailure extends Omit<ConversionFailure, 'detail'> {
  readonly detail?: never;
}

export type ConvertApiResponse = ConvertResponse | ConvertErrorResponse;

/** `GET /api/formats` response body. */
export type FormatsApiResponse = import('./format').ConversionMatrixResponse;

/** `GET /api/health` response body. */
export type HealthApiResponse = HealthResponse;

/** Narrowing helper for the discriminated `ConvertApiResponse` union. */
export function isConvertSuccess(response: ConvertApiResponse): response is ConvertResponse {
  return response.ok;
}

/** Re-exported so route handlers can validate a pair without importing lib. */
export type { ConversionPair, ConversionResult, ConversionFailure, HealthResponse };
