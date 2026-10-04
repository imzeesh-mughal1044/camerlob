/**
 * lib/validation/convert.ts
 * Request-shape validation for the HTTP API, with zod.
 *
 * WHY THIS IS NOT IN `types/`
 * ------------------------------------------------------------------------
 * FOLDER-ARCHITECTURE.md 6.1 requires `types/` to be pure type declarations that
 * import nothing at runtime. A zod schema is executable code, so the schemas live
 * here and `types/` keeps only the inferred result types.
 *
 * SHAPE IS NOT SEMANTICS
 * ------------------------------------------------------------------------
 * These schemas answer "is this the right shape of request?". Whether the pair
 * is *convertible* is a different question, answered by `validateRequest` in
 * `lib/convert/router.ts`. Keeping them apart means a missing form field and an
 * impossible conversion produce two different, accurate error messages instead
 * of one vague rejection.
 */

import { z } from 'zod';

import { MAX_FILES } from '@/lib/constants/limits';
import { getAllSourceFormats, getAllTargetFormats } from '@/lib/convert/formats';

/** Every accepted source identifier, for the enum. */
const SOURCE_IDS = getAllSourceFormats() as [string, ...string[]];

/** Every accepted target identifier, for the enum. */
const TARGET_IDS = getAllTargetFormats() as [string, ...string[]];

/**
 * A format identifier.
 *
 * Trimmed and lowercased, because a picker that sends `JPG` and a picker that
 * sends `jpg` are the same request and rejecting one of them is pedantry. The
 * empty string is rejected here so the message can name the field.
 */
const formatId = (ids: readonly string[], field: string) =>
  z
    .string({
      required_error: `${field} is required.`,
      invalid_type_error: `${field} must be a string.`,
    })
    .trim()
    .min(1, `${field} is required.`)
    .transform((value) => value.toLowerCase())
    .refine((value) => ids.includes(value), {
      message: `${field} must be one of: ${ids.join(', ')}.`,
    });

/** Source format identifier. */
export const sourceFormatSchema = formatId(SOURCE_IDS, 'sourceFormat');

/** Target format identifier. */
export const targetFormatSchema = formatId(TARGET_IDS, 'targetFormat');

/**
 * A multipart file part.
 *
 * Only the two properties the route actually reads are declared. An empty file
 * is rejected as E004's sibling here rather than being discovered mid-convert,
 * where the user has already waited for the upload.
 */
export const uploadedFileSchema = z.custom<File>(
  (value) => typeof File !== 'undefined' && value instanceof File,
  { message: 'Each entry under `files` must be a file.' }
);

/** Optional quality, accepted as a number or a numeric string. */
const optionalIntegerField = (field: string, min: number, max: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === '') return undefined;
      const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
      if (!Number.isInteger(parsed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${field} must be a whole number.` });
        return z.NEVER;
      }
      if (parsed < min || parsed > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} must be between ${min} and ${max}.`,
        });
        return z.NEVER;
      }
      return parsed;
    });

/** Optional boolean, accepted as a real boolean or the strings `true`/`false`. */
const optionalBooleanField = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

/**
 * The multipart fields of `POST /api/convert`.
 *
 * `files` is validated separately because `formData.getAll('files')` is how a
 * multi-file part arrives, and a zod array would force every route handler to
 * remember that.
 */
export const convertFormSchema = z.object({
  sourceFormat: sourceFormatSchema,
  targetFormat: targetFormatSchema,
  clientSide: optionalBooleanField,
  quality: optionalIntegerField('quality', 1, 100),
  preserveMetadata: optionalBooleanField,
  preserveAnimation: optionalBooleanField,
  maxDimension: optionalIntegerField('maxDimension', 1, 50_000),
});

/** Inferred field type of {@link convertFormSchema}. */
export type ConvertForm = z.infer<typeof convertFormSchema>;

/** The same fields, coerced from a plain object rather than a FormData. */
export const convertRequestSchema = convertFormSchema;

/** Inferred request type. */
export type ConvertRequest = z.infer<typeof convertRequestSchema>;

/** One converted file in the response. */
export const conversionResultSchema = z.object({
  originalName: z.string(),
  filename: z.string(),
  targetFormat: z.string(),
  engine: z.string(),
  size: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  mimeType: z.string(),
  /** `data:<mime>;base64,<payload>` — ready for an `<img src>`. */
  dataUrl: z.string(),
});

/** One failed file in the response. */
export const conversionFailureSchema = z.object({
  originalName: z.string(),
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
});

/** Aggregate counts for the batch. */
export const conversionSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  totalDurationMs: z.number().int().nonnegative(),
});

/** Inferred result entry. */
export type ConversionResult = z.infer<typeof conversionResultSchema>;

/** Inferred failure entry. */
export type ConversionFailure = z.infer<typeof conversionFailureSchema>;

/** Inferred summary entry. */
export type ConversionSummary = z.infer<typeof conversionSummarySchema>;

/** The full `POST /api/convert` response body. */
export const convertResponseSchema = z.object({
  results: z.array(conversionResultSchema),
  failures: z.array(conversionFailureSchema),
  summary: conversionSummarySchema,
});

/** Inferred response type. */
export type ConvertResponse = z.infer<typeof convertResponseSchema>;

/** A single engine's entry in `GET /api/health`. */
export const engineHealthSchema = z.object({
  name: z.string(),
  available: z.boolean(),
  required: z.boolean(),
  version: z.string().optional(),
  path: z.string().optional(),
  error: z.string().optional(),
});

/** The full `GET /api/health` response body. */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  engines: z.array(engineHealthSchema),
  checkedAt: z.string(),
});

/** Inferred health type. */
export type HealthResponseBody = z.infer<typeof healthResponseSchema>;

/** One target offered for a source, as `GET /api/formats/[format]` returns it. */
export const targetSchema = z.object({
  to: z.string(),
  engine: z.string(),
});

/** A source format's entry in `GET /api/formats`. */
export const sourceSummarySchema = z.object({
  id: z.string(),
  label: z.string(),
  mimeType: z.string(),
  category: z.string(),
  /** Value for a file input's `accept`, covering every alias of this format. */
  accept: z.string(),
  targets: z.array(targetSchema),
});

/** Inferred source entry. */
export type SourceSummary = z.infer<typeof sourceSummarySchema>;

/** `GET /api/formats` response body. */
export const formatsResponseSchema = z.object({
  sources: z.array(sourceSummarySchema),
  targets: z.array(z.object({ id: z.string(), label: z.string(), mimeType: z.string() })),
  maxFiles: z.number().int().positive(),
  maxFileSizeMb: z.number().int().positive(),
});

/** Inferred formats type. */
export type FormatsResponse = z.infer<typeof formatsResponseSchema>;

/**
 * Flatten a zod failure into one sentence.
 *
 * zod's own `message` is a JSON array of issue objects, which is unreadable in a
 * toast and leaks internal field paths. The first issue is the useful one: it
 * is the first thing wrong, in document order.
 */
export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'The request is not valid.';
  return issue.message;
}

/** The batch ceiling, exported so the route and the schema cannot drift. */
export const MAX_FILES_PER_REQUEST = MAX_FILES;
