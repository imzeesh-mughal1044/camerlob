/**
 * app/api/formats/route.ts
 * `GET /api/formats` — the whole conversion matrix, with the engine for each pair.
 *
 * This is the format picker's data source. It is deliberately server-derived
 * rather than duplicated in the client: the engine column depends on what the
 * installed binaries can do, which the browser cannot know, and a second copy in
 * client code is a second thing to forget to update.
 */

import { getAcceptAttribute, getTargets } from '@/lib/convert/formats';
import { getFormatMeta, SOURCE_FORMATS, TARGET_FORMATS } from '@/lib/constants/formats';
import { MAX_FILE_SIZE_MB, MAX_FILES } from '@/lib/constants/limits';
import { jsonResponse, methodNotAllowed } from '@/lib/utils/api-response';
import type { FormatsResponse, SourceSummary } from '@/lib/validation/convert';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const sources: SourceSummary[] = SOURCE_FORMATS.map((id) => {
    const meta = getFormatMeta(id);
    return {
      id,
      label: meta.label,
      mimeType: meta.mimeType,
      category: meta.category,
      accept: getAcceptAttribute(id),
      targets: getTargets(id),
    };
  });

  const body: FormatsResponse = {
    sources,
    targets: TARGET_FORMATS.map((id) => {
      const meta = getFormatMeta(id);
      return { id, label: meta.label, mimeType: meta.mimeType };
    }),
    maxFiles: MAX_FILES,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
  };

  return jsonResponse(body);
}

export async function POST(): Promise<Response> {
  return methodNotAllowed(['GET']);
}
