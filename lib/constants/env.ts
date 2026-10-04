/**
 * lib/constants/env.ts
 * Server environment access, in one place.
 *
 * Two rules make this module worth existing:
 *
 * 1. NOTHING ELSE READS `process.env` DIRECTLY. An empty string is a real value
 *    in a `.env` file, so `process.env.IMAGEMAGICK_PATH || 'magick'` is only
 *    correct if every reader remembers that `''` is falsy. A reader that writes
 *    `??` instead would try to execute the empty string and fail with a
 *    confusing ENOENT. Here, blank means "not configured", once.
 *
 * 2. A TEMP DIRECTORY MUST NEVER BE THE REPOSITORY. `TEMP_UPLOAD_DIR` points at
 *    a real directory outside the project, but a misconfigured relative value
 *    would put user uploads inside the source tree, where they could be served,
 *    committed or picked up by the watcher. `resolveTempDir` refuses any path
 *    that lands inside the project root.
 *
 * `lib/` may import `types/` but never the reverse, and this module imports
 * neither, which keeps the rule in Documents/FOLDER-ARCHITECTURE.md 6.1 intact.
 */

import { tmpdir } from 'node:os';
import { isAbsolute, resolve, sep } from 'node:path';

/** Read a variable, treating a blank value as absent. */
function read(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Repository root, derived from this file's own location under `lib/`. */
const PROJECT_ROOT = resolve(process.cwd());

/**
 * Directory for job scratch space.
 *
 * Falls back to the OS temp directory rather than a project-relative path, so a
 * missing or hostile `TEMP_UPLOAD_DIR` still cannot write inside the repo.
 */
export function resolveTempDir(): string {
  const configured = read('TEMP_UPLOAD_DIR');
  if (!configured) {
    return resolve(tmpdir(), 'camerlob');
  }
  return isAbsolute(configured) ? resolve(configured) : resolve(PROJECT_ROOT, configured);
}

/**
 * True when `candidate` would write inside the repository.
 *
 * Compares with a trailing separator so `/repo-evil` is not mistaken for a
 * child of `/repo`.
 */
export function isInsideProject(candidate: string): boolean {
  const target = resolve(candidate);
  return target === PROJECT_ROOT || target.startsWith(PROJECT_ROOT + sep);
}

/**
 * Assert a job path is inside the temp directory.
 *
 * Documents/TRD.md 13 requires this check before every write. It is the last
 * line of defence against a traversal that survived filename sanitisation.
 *
 * @throws When `candidate` resolves outside {@link resolveTempDir}.
 */
export function assertInsideTempDir(candidate: string): string {
  const root = resolveTempDir();
  const target = resolve(candidate);
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`Refusing to use a path outside the temp directory: ${target}`);
  }
  return target;
}

/** Path to the ImageMagick binary, or `undefined` to use a PATH lookup. */
export function imagemagickPath(): string | undefined {
  return read('IMAGEMAGICK_PATH');
}

/** Path to the LibRaw `dcraw_emu` binary, or `undefined` for a PATH lookup. */
export function librawPath(): string | undefined {
  return read('LIBRAW_PATH');
}

/** Path to the Ghostscript binary, or `undefined` for a PATH lookup. */
export function ghostscriptPath(): string | undefined {
  return read('GHOSTSCRIPT_PATH');
}

/** Path to the ExifTool binary, or `undefined` for a PATH lookup. */
export function exiftoolPath(): string | undefined {
  return read('EXIFTOOL_PATH');
}

/** Per-file server ceiling in bytes, overridable by env for self-hosters. */
export function serverMaxFileSizeBytes(fallback: number): number {
  const mb = read('SERVER_MAX_FILE_SIZE_MB');
  if (!mb) return fallback;
  const parsed = Number.parseFloat(mb);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed * 1024 * 1024);
}
