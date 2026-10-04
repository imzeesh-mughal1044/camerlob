/**
 * lib/convert/engines/detect.ts
 * Engine identity, version probing and the `EngineKind` <-> `EngineName` bridge.
 *
 * TWO VOCABULARIES, ONE ENGINE
 * ------------------------------------------------------------------------
 * `EngineKind` (`types/engine.ts`) names an *adapter object* and answers "does it
 * run in a browser or on a server", so it has to distinguish three client
 * adapters: CLIENT_WASM, CLIENT_CANVAS and CLIENT_HEIC. That granularity is
 * useful inside the router and useless in a log line or an API payload.
 *
 * `EngineName` collapses those three into `client` and is what crosses the wire.
 * This module owns the translation in both directions, so the mapping is stated
 * once instead of being re-derived — and re-derived slightly differently — at
 * every call site.
 *
 * WHY PROBES ARE CACHED
 * ------------------------------------------------------------------------
 * `/api/health` is polled on a timer by every open tab, and each probe spawns a
 * process. Four spawns per tab per minute is real CPU for an answer that cannot
 * change while the machine is not being reinstalled. The cache is keyed per
 * engine and expires on {@link HEALTH_CACHE_SECONDS}, so a user who installs
 * ImageMagick and reloads sees it within a minute without a server restart.
 * `invalidateEngineCache` exists for the boot path and for tests.
 */

import { ghostscriptPath, imagemagickPath, librawPath } from '@/lib/constants/env';
import { HEALTH_CACHE_MS } from '@/lib/constants/limits';
import { sharpVersion } from '@/lib/convert/engines/sharp';
import { probeVersion } from '@/lib/convert/engines/spawn';
import type { EngineHealth, EngineKind, EngineName } from '@/types/engine';

/** Every engine, in the order the health route reports them. */
export const ENGINE_NAMES: readonly EngineName[] = [
  'sharp',
  'imagemagick',
  'libraw',
  'ghostscript',
  'client',
];

/**
 * Engines whose absence materially degrades the app.
 *
 * sharp is excluded because it ships prebuilt binaries inside the npm package,
 * so it cannot be "missing" in any supported install — listing it would only
 * ever produce a false alarm. `client` is excluded because a browser that
 * cannot decode a JPEG is broken in more interesting ways.
 */
export const CRITICAL_ENGINE_NAMES: readonly EngineName[] = ['imagemagick', 'libraw'];

/** Bridge from adapter kind to wire name. */
export const ENGINE_NAME_OF: Readonly<Record<EngineKind, EngineName>> = {
  CLIENT_WASM: 'client',
  CLIENT_CANVAS: 'client',
  CLIENT_HEIC: 'client',
  SERVER_SHARP: 'sharp',
  SERVER_IMAGEMAGICK: 'imagemagick',
  SERVER_LIBRAW: 'libraw',
  SERVER_GHOSTSCRIPT: 'ghostscript',
};

/**
 * Bridge from wire name to the adapter kind that services it.
 *
 * The three client engines all map to CLIENT_WASM because that is the preferred
 * client adapter; the router falls back to CANVAS and HEIC on its own.
 */
export const ENGINE_KIND_OF: Readonly<Record<EngineName, EngineKind>> = {
  sharp: 'SERVER_SHARP',
  imagemagick: 'SERVER_IMAGEMAGICK',
  libraw: 'SERVER_LIBRAW',
  ghostscript: 'SERVER_GHOSTSCRIPT',
  client: 'CLIENT_WASM',
};

/** Human labels, used in error copy and the health panel. */
export const ENGINE_LABELS: Readonly<Record<EngineName, string>> = {
  sharp: 'sharp',
  imagemagick: 'ImageMagick',
  libraw: 'LibRaw',
  ghostscript: 'Ghostscript',
  client: 'Browser engine',
};

/** How each engine is invoked: its binary, version flag and label. */
interface EngineSpec {
  readonly name: EngineName;
  /** Configured path, or `undefined` to resolve from PATH. */
  readonly configured: () => string | undefined;
  /** Bare name used when no path is configured. */
  readonly fallbackBinary: string;
  /** Args that make the binary print a version and exit. */
  readonly versionArgs: readonly string[];
  /** True when the engine is implemented in-process rather than spawned. */
  readonly inProcess: boolean;
}

const SPECS: Readonly<Record<EngineName, EngineSpec>> = {
  sharp: {
    name: 'sharp',
    configured: () => undefined,
    fallbackBinary: 'sharp',
    versionArgs: ['--version'],
    inProcess: true,
  },
  imagemagick: {
    name: 'imagemagick',
    configured: imagemagickPath,
    fallbackBinary: 'magick',
    versionArgs: ['-version'],
    inProcess: false,
  },
  libraw: {
    name: 'libraw',
    configured: librawPath,
    fallbackBinary: 'dcraw_emu',
    // dcraw_emu does not implement `-v` as "print version". With no arguments
    // it prints its usage banner and exits non-zero, which is a valid "found"
    // signal. Any captured output means the binary is alive.
    versionArgs: [],
    inProcess: false,
  },
  ghostscript: {
    name: 'ghostscript',
    configured: ghostscriptPath,
    fallbackBinary: 'gs',
    versionArgs: ['--version'],
    inProcess: false,
  },
  client: {
    name: 'client',
    configured: () => undefined,
    fallbackBinary: 'browser',
    versionArgs: [],
    inProcess: true,
  },
};

/** The binary an engine will actually execute, honouring its env override. */
export function binaryFor(engine: EngineName): string {
  const spec = SPECS[engine];
  const configured = spec.configured();
  return configured && configured.length > 0 ? configured : spec.fallbackBinary;
}

/** One cached probe result. */
interface CacheEntry {
  readonly at: number;
  readonly health: EngineHealth;
}

const cache = new Map<EngineName, CacheEntry>();

/** Drop every cached probe. Called on boot and by tests. */
export function invalidateEngineCache(): void {
  cache.clear();
}

/**
 * Report whether an engine is usable on this machine.
 *
 * sharp is treated specially: it is imported in-process, so "available" means
 * the module resolved. That is checked by importing it, because a sharp install
 * with a mismatched platform binary throws only when loaded — the single most
 * common sharp installation failure, and one that a PATH probe would miss
 * entirely.
 */
export async function detectEngineVersion(engine: EngineName): Promise<EngineHealth> {
  const spec = SPECS[engine];
  const required = CRITICAL_ENGINE_NAMES.includes(engine);

  if (engine === 'client') {
    return {
      name: 'client',
      available: true,
      version: 'browser',
      path: 'browser',
      required: false,
    };
  }

  if (spec.inProcess) {
    return probeSharp(required);
  }

  const binary = binaryFor(engine);
  const version = await probeVersion(binary, spec.versionArgs);

  if (version === null) {
    return {
      name: engine,
      available: false,
      path: binary,
      error: `${ENGINE_LABELS[engine]} was not found. Install it, or set its *_PATH variable.`,
      required,
    };
  }

  return { name: engine, available: true, version, path: binary, required };
}

/**
 * sharp is an npm package, so availability means "the module loads".
 *
 * The version is read through the adapter's own loader rather than a second
 * `import('sharp')` here. A separate import would mean a second module cache
 * and a second copy of a 30MB native binding, and the two could disagree about
 * whether sharp works.
 */
async function probeSharp(required: boolean): Promise<EngineHealth> {
  const version = await sharpVersion();

  if (version === null) {
    return {
      name: 'sharp',
      available: false,
      path: 'node_modules/sharp',
      error: `sharp failed to load. Reinstall it, or check that this platform has a prebuilt binary.`,
      required,
    };
  }

  return {
    name: 'sharp',
    available: true,
    version: `sharp ${version}`,
    path: 'node_modules/sharp',
    required,
  };
}

/**
 * Probe one engine, reusing a recent result.
 *
 * @param force Bypass the cache. Used by the boot path, where a stale negative
 *   from a previous run would be actively misleading.
 */
export async function getEngineHealth(engine: EngineName, force = false): Promise<EngineHealth> {
  if (!force) {
    const hit = cache.get(engine);
    if (hit && Date.now() - hit.at < HEALTH_CACHE_MS) return hit.health;
  }
  const health = await detectEngineVersion(engine);
  cache.set(engine, { at: Date.now(), health });
  return health;
}

/** Probe every engine, in parallel. */
export async function probeAllEngines(force = false): Promise<EngineHealth[]> {
  return Promise.all(ENGINE_NAMES.map((name) => getEngineHealth(name, force)));
}

/** Availability map, for the router's plan pruning. */
export type EngineAvailability = Partial<Record<EngineName, boolean>>;

/** Reduce a health array to a lookup the router can filter a plan with. */
export function toAvailabilityMap(engines: readonly EngineHealth[]): EngineAvailability {
  const map: EngineAvailability = {};
  for (const engine of engines) map[engine.name] = engine.available;
  return map;
}

/**
 * Overall status for `GET /api/health`.
 *
 * `ok` only when every critical engine is present. A missing optional engine is
 * still `ok`, because Ghostscript governs three formats and nothing else; a user
 * without it has a smaller matrix, not a broken app.
 */
export function statusFor(engines: readonly EngineHealth[]): 'ok' | 'degraded' {
  return engines.some((engine) => engine.required && !engine.available) ? 'degraded' : 'ok';
}
