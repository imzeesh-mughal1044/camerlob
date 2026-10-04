/**
 * app/api/formats/[format]/route.ts
 * `GET /api/formats/[format]` — what one source format can become, and why.
 *
 * The interesting field is `reason`. A format picker that lists nine targets with
 * no explanation is a format picker that gets "why can't I convert this to PDF?"
 * asked about it repeatedly. Each target states the engine that will run and a
 * one-sentence reason, so the UI can show the answer instead of hiding it.
 */

import { canBrowserConvert, getAcceptAttribute, getTargets } from '@/lib/convert/formats';
import { planExecutionChain } from '@/lib/convert/router';
import { getFormatMeta, isKnownSource } from '@/lib/constants/formats';
import { errorResponse, jsonResponse, methodNotAllowed } from '@/lib/utils/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { format: string };
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const id = params.format.toLowerCase();

  // An unknown format is a 404 rather than an empty target list: "you asked
  // about a format that does not exist" and "this format converts to nothing" are
  // different answers, and only the first is a client bug.
  if (!isKnownSource(id)) {
    return errorResponse(404, 'E001', `${params.format} is not a supported source format.`);
  }

  const meta = getFormatMeta(id);
  const targets = getTargets(id).map((target) => {
    let reason: string;
    try {
      reason = planExecutionChain(id, target.to).reason;
    } catch {
      // getTargets only returns pairs from the matrix, so this is unreachable in
      // practice. Reporting the pair without a reason beats failing the request.
      reason = 'Engine chosen from the conversion matrix.';
    }

    return {
      to: target.to,
      engine: target.engine,
      clientSide: canBrowserConvert(id, target.to),
      reason,
    };
  });

  return jsonResponse({
    format: id,
    label: meta.label,
    mimeType: meta.mimeType,
    category: meta.category,
    accept: getAcceptAttribute(id),
    clientSide: targets.some((target) => target.clientSide),
    targets,
  });
}

export async function POST(): Promise<Response> {
  return methodNotAllowed(['GET']);
}
