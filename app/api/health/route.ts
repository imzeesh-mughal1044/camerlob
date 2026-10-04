/**
 * app/api/health/route.ts
 * `GET /api/health` — which engines this machine can actually run.
 *
 * The app polls this to decide whether to offer server-dependent formats at all.
 * On Vercel, where the native binaries do not exist, the answer is `degraded` and
 * the UI hides RAW, PSD and the rest rather than offering a conversion that will
 * fail at upload time.
 */

import { probeAllEngines, statusFor } from '@/lib/convert/engines/detect';
import { jsonResponse, methodNotAllowed } from '@/lib/utils/api-response';
import type { HealthResponseBody } from '@/lib/validation/convert';

// The engines are Node child processes and an in-process native module, so this
// route can never be static or edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const engines = await probeAllEngines();

  const body: HealthResponseBody = {
    status: statusFor(engines),
    engines,
    checkedAt: new Date().toISOString(),
  };

  return jsonResponse(body);
}

/** Explicit 405 rather than Next's HTML page, so a client always gets JSON. */
export async function POST(): Promise<Response> {
  return methodNotAllowed(['GET']);
}
