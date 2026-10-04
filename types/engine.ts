/**
 * types/engine.ts
 * Engine contract. Every adapter in `lib/convert/engines/` implements
 * `EngineAdapter` with the same signature, which is what allows the router to
 * swap engines without any caller naming one.
 */

/** Identifier of a conversion engine. */
export type EngineKind =
  | 'CLIENT_WASM'
  | 'CLIENT_CANVAS'
  | 'CLIENT_HEIC'
  | 'SERVER_SHARP'
  | 'SERVER_IMAGEMAGICK'
  | 'SERVER_LIBRAW'
  | 'SERVER_GHOSTSCRIPT';

/** Where an engine actually executes. */
export type EngineRuntime = 'client' | 'server';

/**
 * Short engine name, as used by the conversion matrix and the API payloads.
 *
 * This is deliberately a different vocabulary from {@link EngineKind}. `EngineKind`
 * answers "which adapter object, and does it run in a browser or on a server",
 * and has to distinguish three client adapters. `EngineName` answers "which
 * engine serviced this file" and is what a user or a log line needs, so the
 * three client adapters collapse to one `client` entry. The two are bridged by
 * `ENGINE_NAME_OF` in `lib/convert/engines/detect.ts`.
 */
export type EngineName = 'sharp' | 'imagemagick' | 'libraw' | 'ghostscript' | 'client';

/** Options a caller may pass through to an engine. */
export interface ConversionOptions {
  /** Encoder quality, 1-100. Honoured by lossy targets only. */
  readonly quality?: number;
  /** Preserve alpha channel where the target supports it. */
  readonly preserveAlpha?: boolean;
  /** Strip EXIF and other metadata from the output. */
  readonly stripMetadata?: boolean;
  /** Longest edge in pixels; the engine must not upscale. */
  readonly maxDimension?: number;
}

/**
 * Uniform engine signature: take a `File`, return a `Blob`, throw a typed
 * error. Engines never import Next.js, React or the filesystem API directly.
 */
export interface EngineAdapter {
  readonly kind: EngineKind;
  readonly runtime: EngineRuntime;
  /** Format identifiers this engine can read. */
  readonly canDecode: readonly string[];
  /** Format identifiers this engine can write. */
  readonly canEncode: readonly string[];
  /** Convert one file. Must not mutate its input. */
  convert(file: File, target: string, options?: ConversionOptions): Promise<Blob>;
}

/** Availability of one engine on the current machine. */
export interface EngineAvailability {
  readonly kind: EngineKind;
  readonly available: boolean;
  /** Resolved binary path or module name that was probed. */
  readonly path: string;
  /** Version banner reported by the binary, when available. */
  readonly version: string | null;
  readonly required: boolean;
  /** Human-readable remediation, e.g. the install command. */
  readonly hint: string | null;
}

/** Payload of `GET /api/health`. */
export interface HealthResponse {
  readonly status: 'ok' | 'degraded';
  readonly version: string;
  readonly node: string;
  readonly engines: readonly EngineAvailability[];
  /** Format ids that cannot be serviced on this machine. */
  readonly unavailableFormats: readonly string[];
}

/**
 * One engine's availability, as reported by `GET /api/health`.
 *
 * Every field except `name` and `available` is optional so a probe that died
 * mid-spawn still produces a well-formed entry rather than a hole in the array:
 * the client renders an engine row per entry, and a missing entry would silently
 * drop a row from the status panel.
 */
export interface EngineHealth {
  readonly name: EngineName;
  readonly available: boolean;
  /** First line of the version banner, e.g. `ImageMagick 7.1.1-47`. */
  readonly version?: string;
  /** The binary or module that answered: an env path, or a bare PATH name. */
  readonly path?: string;
  /** Why the probe failed. Present only when `available` is false. */
  readonly error?: string;
  /** True when absence of this engine degrades the app. */
  readonly required: boolean;
}
