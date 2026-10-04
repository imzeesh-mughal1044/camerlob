/**
 * lib/utils/temp-files.ts
 * Scratch-space lifecycle for the native engines.
 *
 * Every native binary takes a *path*, not a buffer, so a conversion needs real
 * files on disk. This module owns that lifecycle completely, and the invariant
 * it exists to protect is simple: a user's image bytes exist on disk for as
 * long as one conversion takes them and not one millisecond longer.
 *
 * THE THREE RULES
 * ------------------------------------------------------------------------
 * 1. NOTHING IS EVER WRITTEN OUTSIDE THE TEMP DIRECTORY. Paths are built here
 *    from a random id, never from user input, and every resolved path is
 *    re-checked against the temp root before a write. Filename sanitisation
 *    happens too, but sanitisation is about *portability* and this check is
 *    about *containment* — they are not substitutes for each other.
 *
 * 2. DIRECTORIES ARE 0700 AND FILES ARE 0600. A multi-user machine must not let
 *    another account read a half-converted RAW file out of a shared /tmp.
 *
 * 3. CLEANUP IS IDEMPOTENT AND NEVER THROWS. `cleanupTempFile` swallows ENOENT,
 *    because the sweeper and the `finally` block routinely race each other and
 *    a double unlink is normal, not an error. Cleanup that throws inside a
 *    `finally` would mask the original conversion error, which is the one thing
 *    a caller actually needs to see.
 *
 * Per the TRD, one *job* gets one directory holding its input and output, and
 * the directory is removed as a unit. `createJobDir` / `cleanupJobDir` implement
 * that; the single-file helpers exist for engines that need one artefact.
 */

import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { assertInsideTempDir, resolveTempDir } from '@/lib/constants/env';
import { TEMP_MAX_AGE_MS } from '@/lib/constants/limits';

/** Characters no mainstream filesystem accepts in a filename. */
const ILLEGAL_CHARS = /[<>:"/\\|?*]/g;

/** C0 controls and DEL, which are illegal in a path segment on every platform. */
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Ensure the temp root exists with owner-only permissions. Idempotent. */
export async function ensureTempDir(): Promise<string> {
  const root = resolveTempDir();
  await mkdir(root, { recursive: true, mode: 0o700 });
  return root;
}

/**
 * Create a fresh directory for one conversion job.
 *
 * Uses `mkdtemp` rather than composing a name from a UUID so that two processes
 * racing on the same id cannot end up sharing a directory: the OS guarantees the
 * suffix is unique at the moment of creation.
 */
export async function createJobDir(prefix = 'job-'): Promise<string> {
  await ensureTempDir();
  const dir = await mkdtemp(join(resolveTempDir(), prefix));
  return assertInsideTempDir(dir);
}

/**
 * Write a buffer to a new file inside `dir`.
 *
 * @param dir Job directory from {@link createJobDir}.
 * @param filename Basename only. Any directory component is stripped, so a
 *   caller that passes `../../etc/passwd` writes `passwd` inside the job dir.
 * @param buffer Bytes to write.
 * @returns The absolute path, verified to sit inside the temp root.
 */
export async function createTempFile(
  dir: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const target = assertInsideTempDir(join(dir, basenameOnly(filename)));
  await writeFile(target, buffer, { mode: 0o600 });
  return target;
}

/**
 * Read a file and delete it.
 *
 * Read-then-delete in one call so a caller cannot leak the file by forgetting
 * the second half. The read happens first: if the file is already gone, the
 * read's error is the informative one.
 */
export async function readAndDeleteTempFile(path: string): Promise<Buffer> {
  const data = await readFile(path);
  await cleanupTempFile(path);
  return data;
}

/** Read a temp file without deleting it. */
export async function readTempFile(path: string): Promise<Buffer> {
  return readFile(path);
}

/**
 * Delete a file, ignoring absence.
 *
 * Never throws. A missing file is the desired end state, so ENOENT is success.
 * Any other error is logged and swallowed, because this is called from `finally`
 * blocks where throwing would replace the real error.
 */
export async function cleanupTempFile(path: string): Promise<void> {
  try {
    await rm(path, { force: true });
  } catch (error) {
    if (!isNotFound(error)) {
      console.warn('[camerlob] temp file cleanup failed:', (error as Error).message);
    }
  }
}

/**
 * Remove a whole job directory and everything in it.
 *
 * `recursive` is required because a job directory holds both the input and the
 * output. `force` makes it a no-op when the directory is already gone.
 */
export async function cleanupJobDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (error) {
    if (!isNotFound(error)) {
      console.warn('[camerlob] job dir cleanup failed:', (error as Error).message);
    }
  }
}

/**
 * Delete job directories older than {@link TEMP_MAX_AGE_MS}.
 *
 * This exists for one failure mode the `finally` block cannot cover: the process
 * being killed mid-conversion, which leaves a directory behind with nothing left
 * to run the cleanup. `app/instrumentation.ts` calls this on boot and hourly.
 *
 * The age comes from the directory's own mtime rather than a marker file, so a
 * job that is still running is not deleted underneath itself. A directory is
 * only swept once nothing has touched it for the full window.
 *
 * @returns The number of directories removed, for the boot log line.
 */
export async function cleanupTempDir(maxAgeMs: number = TEMP_MAX_AGE_MS): Promise<number> {
  const root = resolve(resolveTempDir());
  let entries: Dirent[];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) return 0;
    console.warn('[camerlob] temp sweep could not read the temp dir:', (error as Error).message);
    return 0;
  }

  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dir = resolve(join(root, entry.name));
    // Defence in depth: never rm anything the temp root does not own.
    if (dir === root || !dir.startsWith(root + sep)) continue;

    try {
      const info = await stat(dir);
      if (info.mtimeMs >= cutoff) continue;
      await rm(dir, { recursive: true, force: true });
      removed += 1;
    } catch (error) {
      if (!isNotFound(error)) {
        console.warn(`[camerlob] temp sweep skipped ${entry.name}:`, (error as Error).message);
      }
    }
  }

  return removed;
}

/** Reduce an arbitrary string to a single safe path segment. */
function basenameOnly(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? '';
  const cleaned = base
    .replace(CONTROL_CHARS, '')
    .replace(ILLEGAL_CHARS, '')
    .replace(/^\.+/, '')
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 180) : 'unnamed';
}

/** True when the error is a missing-path error from any fs call. */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  );
}
