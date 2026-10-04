/**
 * app/api/convert/route.ts
 * `POST /api/convert` — the server conversion endpoint.
 *
 * WHAT HAPPENS, IN ORDER
 * ------------------------------------------------------------------------
 *   1. Parse the multipart body. A malformed body is E001.
 *   2. Validate the *shape* of the fields with zod (`lib/validation/convert.ts`).
 *   3. Validate the *meaning* with `validateRequest` — is this pair real?
 *   4. Enforce the batch ceilings: count, per-file size, aggregate size.
 *   5. For each file: re-detect the format from magic bytes and compare it with
 *      what the client claimed, then convert, three at a time.
 *
 * WHY STEP 5 RE-DETECTS
 * ------------------------------------------------------------------------
 * The declared `sourceFormat` is a string in a form field, and a string in a form
 * field is whatever the sender typed. A file called `holiday.jpg` containing a
 * ZIP, or a PNG renamed to `.cr2` to reach the RAW pipeline, would otherwise be
 * handed to a native decoder as the wrong format. The bytes decide, and a
 * disagreement is E010. This is the check TRD 14.2 calls the fifth validation
 * step, and it is the reason a conversion service can accept uploads at all.
 *
 * A PARTIAL FAILURE IS A SUCCESS
 * ------------------------------------------------------------------------
 * A batch of ten where two files are corrupt returns 200 with eight results and
 * two failures. Returning 500 would tell the user their eight good conversions
 * did not happen, and they would retry the whole batch. `summary.failed` is the
 * signal; the status code stays 200 as long as the request itself was valid.
 */

import { ConversionError, toConversionError } from '@/lib/constants/errors';
import { getFormatMeta } from '@/lib/constants/formats';
import {
  MAX_BATCH_SIZE_BYTES,
  MAX_CONCURRENCY,
  MAX_FILES,
  SERVER_MAX_FILE_SIZE_BYTES,
} from '@/lib/constants/limits';
import { detectFormatFromBuffer } from '@/lib/utils/magic-bytes';
import { buildOutputFilename } from '@/lib/utils/sanitize-filename';
import {
  errorResponse,
  errorResponseFrom,
  jsonResponse,
  methodNotAllowed,
} from '@/lib/utils/api-response';
import { executeWithFallback, planExecutionChain, validateRequest } from '@/lib/convert/router';
import { formatsEquivalent } from '@/lib/convert/formats';
import { probeAllEngines, toAvailabilityMap } from '@/lib/convert/engines/detect';
import {
  convertFormSchema,
  firstIssueMessage,
  type ConvertForm,
  type ConversionFailure,
  type ConversionResult,
  type ConvertResponse,
} from '@/lib/validation/convert';

// Native binaries and in-process sharp: Node only, never static, never edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A 20-file batch of RAW development can legitimately take minutes. The
// platform default would kill it mid-batch and report a timeout the user cannot
// act on.
export const maxDuration = 300;

/** Read a string field from the form. */
function field(form: FormData, name: string): unknown {
  const value = form.get(name);
  return typeof value === 'string' ? value : undefined;
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();

  // --- 1. body -------------------------------------------------------------
  let form: FormData;
  try {
    form = await request.formData();
  } catch (cause) {
    return errorResponse(400, 'E001', 'The request body could not be read as multipart form data.');
  }

  // --- 2. shape ------------------------------------------------------------
  const shape = convertFormSchema.safeParse({
    sourceFormat: field(form, 'sourceFormat'),
    targetFormat: field(form, 'targetFormat'),
    clientSide: field(form, 'clientSide'),
    quality: field(form, 'quality'),
    preserveMetadata: field(form, 'preserveMetadata'),
    preserveAnimation: field(form, 'preserveAnimation'),
    maxDimension: field(form, 'maxDimension'),
  });

  if (!shape.success) {
    return errorResponse(400, 'E001', firstIssueMessage(shape.error));
  }
  const options: ConvertForm = shape.data;

  // A client-side request should never have reached the network. Doing the work
  // here anyway would upload a file the user was told would stay local.
  if (options.clientSide) {
    return errorResponse(
      400,
      'E001',
      'This conversion runs in the browser. Convert it locally instead of uploading the file.'
    );
  }

  // --- 3. meaning ----------------------------------------------------------
  let requested;
  try {
    requested = validateRequest(options);
  } catch (error) {
    return errorResponseFrom(error);
  }

  // --- 4. ceilings ---------------------------------------------------------
  const files = form.getAll('files').filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return errorResponse(400, 'E001', 'No files were supplied.');
  }
  if (files.length > MAX_FILES) {
    return errorResponse(400, 'E003', `A batch may contain at most ${MAX_FILES} files.`);
  }

  for (const file of files) {
    if (file.size === 0) {
      return errorResponse(400, 'E004', `${file.name} is empty.`);
    }
    if (file.size > SERVER_MAX_FILE_SIZE_BYTES) {
      return errorResponse(
        413,
        'E002',
        `${file.name} is larger than the ${Math.round(SERVER_MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB server limit.`
      );
    }
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_BATCH_SIZE_BYTES) {
    return errorResponse(413, 'E002', 'The batch is larger than the total upload limit.');
  }

  // Probe once for the whole batch rather than per file: the engines do not
  // change mid-request, and the results are cached.
  const availability = toAvailabilityMap(await probeAllEngines());

  let plan;
  try {
    plan = planExecutionChain(requested.sourceFormat, requested.targetFormat, {
      availability,
      maxDimension: requested.maxDimension,
    });
  } catch (error) {
    return errorResponseFrom(error);
  }

  // --- 5. convert ----------------------------------------------------------
  const results: ConversionResult[] = [];
  const failures: ConversionFailure[] = [];
  const takenNames = new Set<string>();

  await runWithConcurrency(files, MAX_CONCURRENCY, async (file) => {
    try {
      results.push(await convertOne(file, plan, requested, takenNames));
    } catch (error) {
      const failure = toConversionError(error, { format: requested.sourceFormat });
      console.error(`[camerlob] ${file.name}: ${failure.code} ${failure.detail}`);
      failures.push({
        originalName: file.name,
        code: failure.code,
        message: failure.message,
        retryable: failure.retryable,
      });
    }
  });

  // Deterministic output order regardless of which file finished first, so a
  // client can zip results against its own file list by position.
  results.sort((a, b) => a.originalName.localeCompare(b.originalName));
  failures.sort((a, b) => a.originalName.localeCompare(b.originalName));

  const body: ConvertResponse = {
    results,
    failures,
    summary: {
      total: files.length,
      succeeded: results.length,
      failed: failures.length,
      totalDurationMs: Date.now() - startedAt,
    },
  };

  return jsonResponse(body);
}

/** Convert one file, or throw a `ConversionError`. */
async function convertOne(
  file: File,
  plan: ReturnType<typeof planExecutionChain>,
  requested: ReturnType<typeof validateRequest>,
  takenNames: Set<string>
): Promise<ConversionResult> {
  const input = Buffer.from(await file.arrayBuffer());

  // Re-check the size from the bytes actually received. `file.size` comes from
  // the part header, which is as much client-controlled as the format field.
  if (input.length > SERVER_MAX_FILE_SIZE_BYTES) {
    throw new ConversionError('E002', `${file.name} exceeds the server size limit.`, {
      format: requested.sourceFormat,
    });
  }
  if (input.length === 0) {
    throw new ConversionError('E004', `${file.name} is empty.`, {
      format: requested.sourceFormat,
    });
  }

  // The bytes decide what this is. Not the extension, not the MIME type, and not
  // `file.name` — `detectFormatFromBuffer` deliberately takes no filename at
  // all, so there is no argument a caller could pass to influence the answer.
  const detected = detectFormatFromBuffer(input);

  if (detected === null) {
    throw new ConversionError('E004', `${file.name} is not a recognised image format.`, {
      format: requested.sourceFormat,
    });
  }

  if (!formatsEquivalent(detected, requested.sourceFormat)) {
    // E010, not E004: the file is readable, it is simply not what was claimed.
    // That distinction is the difference between "your file is broken" and
    // "your file is not the format you said it was".
    throw new ConversionError(
      'E010',
      `${file.name} is really a ${getFormatMeta(detected).label} file, not ${getFormatMeta(requested.sourceFormat).label}.`,
      { format: requested.sourceFormat }
    );
  }

  const output = await executeWithFallback(plan, input, {
    quality: requested.quality,
    preserveMetadata: requested.preserveMetadata,
    preserveAnimation: requested.preserveAnimation,
    maxDimension: requested.maxDimension,
    sourceFormat: detected,
  });

  const meta = getFormatMeta(requested.targetFormat);
  // `buildOutputFilename` sanitises the client-supplied name, so a filename like
  // `../../etc/passwd` becomes `etcpasswd` before it is ever returned.
  const filename = buildOutputFilename(
    file.name,
    meta.extensions[0] ?? requested.targetFormat,
    takenNames
  );
  takenNames.add(filename);

  return {
    originalName: file.name,
    filename,
    targetFormat: requested.targetFormat,
    engine: plan.primary,
    size: output.length,
    mimeType: meta.mimeType,
    dataUrl: `data:${meta.mimeType};base64,${output.toString('base64')}`,
  };
}

/**
 * Run `worker` over `items`, at most `limit` at a time.
 *
 * A plain index cursor rather than a promise pool: it keeps memory flat, never
 * starts more than `limit` conversions, and preserves result ordering by index
 * so a slow first file cannot reorder the batch.
 */
async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const width = Math.max(1, Math.min(limit, items.length));
  let next = 0;

  const runners = Array.from({ length: width }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      await worker(items[index] as T, index);
    }
  });

  await Promise.all(runners);
}

export async function GET(): Promise<Response> {
  return methodNotAllowed(['POST']);
}
