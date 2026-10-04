/**
 * lib/convert/engines/spawn.ts
 * The one place a native binary is executed.
 *
 * Every engine shells out, and every one of them needs the same four things:
 * an argument array rather than a command string, a hard timeout, a captured
 * stdout/stderr, and an ENOENT that is distinguishable from a non-zero exit.
 * Getting any of those subtly different in four files is how a timeout silently
 * stops working in one engine, so the logic lives here once.
 *
 * WHY AN ARGUMENT ARRAY, ALWAYS
 * ------------------------------------------------------------------------
 * `exec('convert ' + userFilename)` is a shell injection. A filename of
 * `; rm -rf ~` is enough. Passing an array with `shell: false` means Node hands
 * the binary a literal argv with no shell to interpret metacharacters, so the
 * only user-controlled values that can reach a process are the sanitised
 * filename and a format id drawn from the frozen matrix. This is the mechanism
 * behind the claim in Documents/TRD.md 13; there is no second, weaker path.
 *
 * WHY STDOUT IS CAPPED
 * ------------------------------------------------------------------------
 * `dcraw_emu` with no output file writes a whole PPM to stdout, which for a
 * 40-megapixel RAW is tens of megabytes. That is wanted — it is the developed
 * image. But an unbounded capture is a memory-exhaustion vector for a binary
 * that misbehaves, so the ceiling is explicit and its breach is reported as a
 * typed error rather than silently truncating a half-written image.
 */

import { spawn } from 'node:child_process';
import type { SpawnOptions } from 'node:child_process';

import { makeConversionError } from '@/lib/constants/errors';
import type { ErrorCode } from '@/types/error';

/** Largest stdout capture accepted, in bytes. Sized for a developed RAW. */
export const MAX_CAPTURE_BYTES = 256 * 1024 * 1024;

/** Result of a completed spawn. */
export interface RunResult {
  readonly stdout: Buffer;
  readonly stderr: string;
  /** True when the process exited 0. */
  readonly ok: boolean;
  /** Exit code, or `null` when the process was killed by a signal. */
  readonly exitCode: number | null;
}

/** Options for {@link runBinary}. */
export interface RunOptions {
  /** Hard wall-clock limit. The child is killed when it elapses. */
  readonly timeoutMs: number;
  /** Working directory for the child. */
  readonly cwd?: string;
  /** Extra environment entries merged over `process.env`. */
  readonly env?: Readonly<Record<string, string>>;
  /** Max stdout bytes before the run is abandoned. */
  readonly maxBuffer?: number;
  /**
   * Read the child as text instead of Buffer. Convenience for the version
   * probes, which only ever want a banner string.
   */
  readonly encoding?: 'utf8';
}

/**
 * True when the failure was "this binary does not exist", as opposed to the
 * binary running and failing.
 *
 * The distinction drives E006 (install the engine) versus E004/E005 (the file
 * is bad or the engine broke), and a user seeing "install ImageMagick" for a
 * corrupt PSD would be actively misled.
 */
export function isBinaryMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  );
}

/** True when the failure was the wall-clock limit elapsing. */
export function isTimedOut(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: string }).code;
  // Node reports the spawn timeout as ETIMEDOUT, and a killed child as
  // SIGTERM. Both mean the same thing to a caller: we gave up waiting.
  return code === 'ETIMEDOUT' || code === 'SIGTERM' || code === 'SIGKILL';
}

/**
 * Run a binary to completion.
 *
 * Never rejects for a non-zero exit: a converter that fails on a corrupt file
 * exits non-zero *and* explains why on stderr, and that explanation is the
 * useful diagnostic. The caller inspects `ok` and `stderr`.
 *
 * Rejects only for the two cases the caller cannot meaningfully interpret:
 * the binary is missing (E006) or the timeout elapsed (E007).
 *
 * @param binary Executable name or absolute path. Never passed through a shell.
 * @param args Argument vector, passed verbatim.
 * @param options Timeout and capture limits.
 * @param errorCode Code to raise on timeout. Lets the RAW path report E007 while
 *   the caller keeps a single failure mode.
 */
export async function runBinary(
  binary: string,
  args: readonly string[],
  options: RunOptions,
  errorCode: ErrorCode = 'E007'
): Promise<RunResult> {
  const { timeoutMs, cwd, env, maxBuffer = MAX_CAPTURE_BYTES, encoding } = options;

  const spawnOptions: SpawnOptions = {
    shell: false,
    windowsHide: true,
    // Never inherit: a child that reads stdin can otherwise block forever, and
    // an inherited TTY would corrupt binary output.
    stdio: ['ignore', 'pipe', 'pipe'],
    ...(cwd ? { cwd } : {}),
    ...(env ? { env: { ...process.env, ...env } } : {}),
  };

  return new Promise<RunResult>((resolvePromise, rejectPromise) => {
    const child = spawn(binary, [...args], spawnOptions);

    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderr = '';
    let settled = false;
    let timedOut = false;

    // A timer that is not cleared leaks a handle and keeps the process alive
    // after the work is done, so it is always cleared on settle.
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const settle = (action: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      action();
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxBuffer) {
        settle(() =>
          rejectPromise(
            makeConversionError(
              'E008',
              null,
              `${binary} produced more than ${maxBuffer} bytes on stdout`
            )
          )
        );
        child.kill('SIGKILL');
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      settle(() => {
        if (isBinaryMissing(error)) {
          rejectPromise(
            makeConversionError(
              'E006',
              binary,
              `spawn ${binary} failed: ${error.message}`,
              {},
              error
            )
          );
          return;
        }
        rejectPromise(
          makeConversionError('E009', binary, `spawn ${binary} failed: ${error.message}`, {}, error)
        );
      });
    });

    child.on('close', (code, signal) => {
      settle(() => {
        if (timedOut) {
          rejectPromise(
            makeConversionError(
              errorCode,
              binary,
              `${binary} exceeded its ${timeoutMs}ms budget and was killed (signal ${signal ?? 'none'})`
            )
          );
          return;
        }
        const stdout = Buffer.concat(stdoutChunks);
        resolvePromise({
          stdout: encoding === 'utf8' ? Buffer.from(stdout.toString('utf8'), 'utf8') : stdout,
          stderr,
          ok: code === 0,
          exitCode: code,
        });
      });
    });
  });
}

/**
 * Run a binary and return its version banner.
 *
 * Never throws: a missing binary is a normal, expected answer for a health
 * probe, and it is reported as `null` rather than as an error so the caller can
 * render "not installed" without a try/catch.
 *
 * @returns The first non-empty line of output, or `null` if the binary is
 *   absent, produced nothing, or did not exit cleanly.
 */
export async function probeVersion(
  binary: string,
  args: readonly string[],
  timeoutMs = 5_000
): Promise<string | null> {
  try {
    const result = await runBinary(binary, args, { timeoutMs, maxBuffer: 64 * 1024 });
    if (!result.ok && result.stderr.trim().length === 0 && result.stdout.length === 0) {
      return null;
    }
    const text = `${result.stdout.toString('utf8')}${result.stderr}`;
    const firstLine = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    return firstLine ?? null;
  } catch {
    // A probe never fails loudly. Absence is the answer.
    return null;
  }
}
