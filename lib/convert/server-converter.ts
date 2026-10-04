/**
 * lib/convert/server-converter.ts
 * The server-side engine: plans a conversion, then runs it against whichever of
 * the Node engines are actually installed on this machine.
 *
 * TODO: implement in Prompt #9.
 *
 * WHAT THIS FILE IS RESPONSIBLE FOR
 * ------------------------------------------------------------------------
 * TRD section 2.2 draws a hard boundary: this file is the only place in the
 * repository that may reach `sharp`, `child_process` or the filesystem, and it
 * is reached only from the API route handlers under `app/api/`.
 * `client-converter.ts` is its mirror on the browser side, and the two never
 * import each other — they meet only at the pure, framework-free `router.ts`.
 * That boundary is the reason `lib/convert/` stays importable from a CLI, a
 * daemon or a desktop shell, so it is worth stating plainly rather than leaving
 * to convention.
 *
 * WHY IT EXISTS AS A SEPARATION AND NOT JUST A FLAG
 * ------------------------------------------------------------------------
 * A single `convert(file, source, target)` with an `isServer` boolean looks
 * equivalent and is not. The two engines have genuinely different failure
 * modes: the client engine fails closed (a browser cannot decode the format,
 * so it throws immediately) while the server engine fails *open* (the binary is
 * simply absent and a fallback may still succeed). Collapsing them makes the
 * escalation decision in `router.ts` unanswerable, because the caller could no
 * longer tell "this format is impossible" from "this machine is missing a
 * tool".
 *
 * SCOPE OF THE STUB
 * ------------------------------------------------------------------------
 * The adapter registry below is real: it wires the four implemented adapters
 * together so `executePlan` has something to dispatch to, and the availability
 * probe is real, because `/api/health` needs to answer that question before any
 * conversion is attempted. Only the conversion is unimplemented, and it fails
 * loudly with E006 rather than returning a wrong file.
 *
 * @see Documents/TRD.md section 2.2 for the server/client boundary rule.
 * @see lib/convert/router.ts for plan execution and escalation.
 */

import { ghostscriptAdapter } from '@/lib/convert/engines/ghostscript';
import { imagemagickAdapter } from '@/lib/convert/engines/imagemagick';
import { librawAdapter } from '@/lib/convert/engines/libraw';
import { sharpAdapter } from '@/lib/convert/engines/sharp';
import { planConversion } from '@/lib/convert/router';
import { ConversionError } from '@/lib/constants/errors';
import type { AdapterRegistry } from '@/lib/convert/router';
import type { ConversionOptions, EngineAdapter, EngineKind } from '@/types/engine';

/**
 * Every server engine, keyed by the kind the router asks for.
 *
 * Only sharp is a guaranteed import: the other three adapters resolve their
 * binary lazily inside `convert`, so this module is safe to import in an
 * environment where ImageMagick, LibRaw and Ghostscript are all absent — which
 * is exactly the case `/api/health` has to report on.
 */
export const serverAdapters: AdapterRegistry = {
  SERVER_SHARP: sharpAdapter,
  SERVER_IMAGEMAGICK: imagemagickAdapter,
  SERVER_LIBRAW: librawAdapter,
  SERVER_GHOSTSCRIPT: ghostscriptAdapter,
};

/** The Node engine that will be tried first for a given pair. */
export function preferredEngine(source: string, target: string): EngineKind | null {
  const plan = planConversion(source, target);
  return plan.engines.find((engine) => engine.startsWith('SERVER_')) ?? null;
}

/**
 * Convert one file on the server.
 *
 * TODO: implement in Prompt #9 — plan the conversion, drop any `CLIENT_*` engine
 * from the plan (this is the server path; the client already had its turn and
 * escalated here), then call `executePlan` with `serverAdapters`, writing each
 * intermediate file to `TEMP_UPLOAD_DIR` and revoking it in a `finally`.
 */
export async function convertServerSide(
  file: File,
  target: string,
  options: ConversionOptions = {}
): Promise<Blob> {
  void file;
  void target;
  void options;
  throw new ConversionError('E006', 'The server converter is not implemented yet (Prompt #9)', {
    engine: 'server',
  });
}

/** Look up one adapter by kind, for the health route. */
export function serverAdapterFor(engine: EngineKind): EngineAdapter | undefined {
  return serverAdapters[engine];
}
