/**
 * hooks/useEngineStatus.ts
 * Polls `GET /api/health` and reports which engines this machine can reach.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE FIRST PROBE IS OPTIONAL, NEVER BLOCKING. A converter that cannot start
 *    because a health endpoint 404s is worse than a converter that starts and
 *    says so. Every failure mode — network error, 404, non-JSON body, abort on
 *    unmount — resolves to a definite `unreachable` rather than a rejected
 *    promise or a console error. Nothing here logs, because rule 10 of the brief
 *    is zero console noise and a missing route is a normal state in this build.
 *
 * 2. IT IS POLLED ONCE A MINUTE, NOT ONCE PER MOUNT. An earlier version probed
 *    exactly once and documented the reason: availability changes when a binary
 *    is installed and the server restarted, not while a page is open. That is
 *    true, and it is also why a fixed one-shot leaves the panel permanently
 *    stale for a long-running tab — the common case for a converter someone
 *    leaves open. The server caches probes for `HEALTH_CACHE_SECONDS`, so a
 *    60-second client poll costs one real probe per minute and never reaches the
 *    binaries more often than that.
 *
 * 3. THE RESPONSE IS NORMALISED AT THE EDGE. The route answers with an array of
 *    `EngineHealth`, but the TRD historically described a boolean map and the
 *    panel should not care which arrived. {@link normalise} accepts both and
 *    always returns the five canonical engines, filling a missing entry with an
 *    `available: false` placeholder so a row never silently disappears.
 *
 * 4. `isReady` MEANS `status === 'ok'`, NOT "every engine is installed". A
 *    machine without Ghostscript has a smaller matrix, not a broken app, and
 *    `statusFor` already encodes that judgement on the server. Re-deriving it
 *    here from the engine count would let the two disagree.
 */

'use client';

import * as React from 'react';

import { HEALTH_CACHE_MS } from '@/lib/constants/limits';
import type { EngineHealth, EngineName } from '@/types/engine';

/** Canonical engine order, matching `ENGINE_NAMES` in the server detector. */
const ENGINE_ORDER: readonly EngineName[] = [
  'sharp',
  'imagemagick',
  'libraw',
  'ghostscript',
  'client',
];

export type EngineState = 'probing' | 'ready' | 'degraded' | 'unreachable';

export interface EngineStatus {
  readonly state: EngineState;
  /** True only when the server reported `status: 'ok'`. */
  readonly isReady: boolean;
  /** True only when every engine the response mentioned is available. */
  readonly allReady: boolean;
  /** Human-readable reason when `state` is `degraded` or `unreachable`. */
  readonly note: string | null;
  readonly engineCount: number;
  readonly readyCount: number;
  readonly version: string | null;
  /** Per-engine rows, always the five canonical engines in a fixed order. */
  readonly engines: readonly EngineHealth[];
  /** ISO-8601 timestamp from the last successful probe, or `null`. */
  readonly lastChecked: string | null;
  /** True while a refresh triggered by {@link EngineStatus.refresh} is running. */
  readonly isRefreshing: boolean;
  /** Force a re-probe now, bypassing the cache on the next poll. */
  readonly refresh: () => void;
}

const PROBE_TIMEOUT_MS = 4000;

const EMPTY: EngineStatus = {
  state: 'probing',
  isReady: false,
  allReady: false,
  note: null,
  engineCount: 0,
  readyCount: 0,
  version: null,
  engines: [],
  lastChecked: null,
  isRefreshing: false,
  refresh: () => {},
};

const UNREACHABLE: EngineHealth[] = ENGINE_ORDER.map((name) => ({
  name,
  available: false,
  required: name === 'imagemagick' || name === 'libraw',
}));

function isEngineHealth(value: unknown): value is EngineHealth {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as { name?: unknown; available?: unknown };
  return typeof entry.name === 'string' && typeof entry.available === 'boolean';
}

/**
 * Reduce either health dialect to a fixed list of five engine rows.
 *
 * Missing engines are filled in rather than dropped: a response that mentioned
 * only sharp would otherwise render a one-row panel, which reads as "everything
 * is fine" when it is the opposite.
 */
function normalise(
  payload: unknown
): { engines: EngineHealth[]; status: 'ok' | 'degraded'; checkedAt: string | null } | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const body = payload as { engines?: unknown; status?: unknown; checkedAt?: unknown };

  const status = body.status === 'ok' ? 'ok' : 'degraded';
  const checkedAt = typeof body.checkedAt === 'string' ? body.checkedAt : null;

  // Dialect A — the array form. This is what app/api/health/route.ts sends.
  if (Array.isArray(body.engines)) {
    const reported = body.engines.filter(isEngineHealth);
    if (reported.length === 0) return null;
    const byName = new Map(reported.map((engine) => [engine.name, engine]));
    const engines = ENGINE_ORDER.map(
      (name): EngineHealth =>
        byName.get(name) ?? {
          name,
          available: false,
          required: name === 'imagemagick' || name === 'libraw',
        }
    );
    return { engines, status, checkedAt };
  }

  // Dialect B — the boolean map from the TRD. Kept for an older server.
  if (typeof body.engines === 'object' && body.engines !== null) {
    const map = body.engines as Record<string, unknown>;
    const booleans = Object.entries(map).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === 'boolean'
    );
    if (booleans.length === 0) return null;
    const engines = booleans.map(
      ([name, available]): EngineHealth => ({
        name: name as EngineName,
        available,
        required: name === 'imagemagick' || name === 'libraw',
      })
    );
    return { engines, status, checkedAt };
  }

  return null;
}

function describe(engines: readonly EngineHealth[], isReady: boolean): EngineStatus {
  const ready = engines.filter((engine) => engine.available).length;
  const total = engines.length;
  const version = engines.find((engine) => engine.version)?.version ?? null;

  const state: EngineState = !isReady ? 'degraded' : 'ready';
  const missing = engines.filter((engine) => engine.required && !engine.available);

  return {
    state,
    isReady,
    allReady: total > 0 && ready === total,
    note: isReady
      ? null
      : missing.length > 0
        ? `${missing.map((engine) => engine.name).join(', ')} unavailable — RAW and layered formats need them.`
        : `${total - ready} of ${total} engines unavailable. RAW, PSD and TIFF need them.`,
    engineCount: total,
    readyCount: ready,
    version,
    engines,
    lastChecked: null,
    isRefreshing: false,
    refresh: () => {},
  };
}

export function useEngineStatus(): EngineStatus {
  const [status, setStatus] = React.useState<EngineStatus>(EMPTY);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const settle = (next: EngineStatus) => {
      if (alive) setStatus(next);
    };

    const probe = async () => {
      const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
          headers: { accept: 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          settle({
            ...describe(UNREACHABLE, false),
            state: 'unreachable',
            note: 'Engine probe unavailable. Local engines are not detected.',
          });
          return;
        }

        // Guard the parse: an HTML error page would otherwise throw here and
        // surface as an unhandled rejection.
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          settle({
            ...describe(UNREACHABLE, false),
            state: 'unreachable',
            note: 'Engine probe unavailable. Local engines are not detected.',
          });
          return;
        }

        const parsed = normalise(await response.json());
        if (!parsed) {
          settle({
            ...describe(UNREACHABLE, false),
            state: 'unreachable',
            note: 'Engine probe unavailable. Local engines are not detected.',
          });
          return;
        }

        settle({
          ...describe(parsed.engines, parsed.status === 'ok'),
          lastChecked: parsed.checkedAt,
        });
      } catch {
        // Abort, offline, or a thrown fetch. All mean the same thing here.
        settle({
          ...describe(UNREACHABLE, false),
          state: 'unreachable',
          note: 'Engine probe unavailable. Local engines are not detected.',
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    void probe();
    // Decision 2: one poll per cache window. The server's probe cache is the
    // same length, so this can never cause more than one real probe per window.
    const timer = setInterval(() => void probe(), HEALTH_CACHE_MS);

    return () => {
      alive = false;
      clearInterval(timer);
      controller.abort();
    };
  }, [refreshKey]);

  const refresh = React.useCallback(() => setRefreshKey((key) => key + 1), []);

  return React.useMemo(() => ({ ...status, refresh }), [status, refresh]);
}
