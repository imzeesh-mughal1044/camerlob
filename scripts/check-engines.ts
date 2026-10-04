/**
 * scripts/check-engines.ts
 * Probes the native image binaries Camerlob shells out to, and tells the
 * developer exactly how to install the ones that are missing.
 *
 * WHY THIS IS A SCRIPT AND NOT A BUILD STEP
 * ------------------------------------------------------------------------
 * The server engine (TRD section 4) shells out to four binaries that ship with
 * no npm package: ImageMagick, LibRaw, Ghostscript and ExifTool. Whether they
 * exist is a property of the developer's machine, not of the repository, so it
 * cannot be resolved at install time or cached into a lockfile. This script is
 * the one place that answers the question, and CI runs it before the test suite
 * so a missing binary is named up front rather than surfacing as an opaque
 * E006 "engine missing" on someone's first RAW conversion.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. SPAWNSYNC, NOT EXEC. `exec` runs through a shell, so a PATH entry
 *    containing a space or a quote would change the command that is executed.
 *    Every probe here is a fixed argv, and `spawnSync` with `shell: false` is
 *    the only form that guarantees the binary named is the binary run.
 *
 * 2. AN ENV PATH OVERRIDE WINS OVER PATH. `.env.local` may pin
 *    IMAGEMAGICK_PATH to an absolute binary (the usual fix for a Windows
 *    install that is not on PATH, or a Homebrew prefix that differs from
 *    /usr/bin). The override is probed first and PATH is only searched when no
 *    override is set, which is also what the runtime converters do, so this
 *    report and the app can never disagree about which binary is in play.
 *
 * 3. EXIT CODE IS ABOUT CRITICAL ENGINES ONLY. ImageMagick and LibRaw gate
 *    whole format families, so a machine missing either cannot do the job and
 *    exits 1. Ghostscript and ExifTool narrow the supported set without
 *    breaking it, so they are reported and downgraded to a warning. Without
 *    this, a contributor with no Ghostscript could not run a single test on
 *    their laptop.
 *
 * 4. IDEMPOTENT AND SIDE-EFFECT FREE. The script only reads PATH and spawns
 *    `--version`, which every one of these binaries answers without touching
 *    the filesystem. It writes nothing, so running it twice in a row cannot
 *    change the second run's answer.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** One probeable native tool. */
interface EngineSpec {
  /** Stable id used in output and in the manual checklist. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** True when a missing binary should fail the run. */
  readonly critical: boolean;
  /** Env var that pins an absolute binary path, if the project defines one. */
  readonly envVar: string | null;
  /** Candidate binaries, probed in order. */
  readonly candidates: readonly string[];
  /** argv used to interrogate the binary once found. */
  readonly versionArgs: readonly string[];
  /** Package names per platform, used to build the install hint. */
  readonly packages: {
    readonly windows: string;
    readonly darwin: string;
    readonly debian: string;
    readonly arch: string;
  };
}

const ENGINES: readonly EngineSpec[] = [
  {
    id: 'imagemagick',
    name: 'ImageMagick',
    critical: true,
    envVar: 'IMAGEMAGICK_PATH',
    // `magick` is the ImageMagick 7 name; `convert` is the ImageMagick 6 one
    // and is also a stock Windows system binary, so it is probed second and
    // only trusted once its banner confirms it is ImageMagick.
    candidates: ['magick', 'convert'],
    versionArgs: ['-version'],
    packages: {
      windows: 'winget install ImageMagick.ImageMagick',
      darwin: 'brew install imagemagick',
      debian: 'sudo apt install imagemagick',
      arch: 'sudo pacman -S imagemagick',
    },
  },
  {
    id: 'libraw',
    name: 'LibRaw',
    critical: true,
    envVar: 'LIBRAW_PATH',
    candidates: ['dcraw_emu', 'rawtherapee-cli'],
    // dcraw_emu does not implement `-v` as "print version" — `-v` means
    // "verbose processing" and produces no output. With no arguments at all
    // the binary prints its usage banner to stdout/stderr and exits non-zero,
    // which is the signal we want. `probe()` treats "any output" as proof of
    // life regardless of exit code.
    versionArgs: [],
    packages: {
      windows: 'winget install LibRaw.LibRaw  (or download from https://www.libraw.org/download)',
      darwin: 'brew install libraw',
      debian: 'sudo apt install libraw-bin',
      arch: 'sudo pacman -S libraw',
    },
  },
  {
    id: 'ghostscript',
    name: 'Ghostscript',
    critical: false,
    envVar: 'GHOSTSCRIPT_PATH',
    candidates: ['gs', 'gswin64c', 'gswin32c'],
    versionArgs: ['--version'],
    packages: {
      windows: 'winget install ArtifexSoftware.GhostScript',
      darwin: 'brew install ghostscript',
      debian: 'sudo apt install ghostscript',
      arch: 'sudo pacman -S ghostscript',
    },
  },
  {
    id: 'exiftool',
    name: 'ExifTool',
    critical: false,
    envVar: 'EXIFTTOOL_PATH',
    candidates: ['exiftool'],
    versionArgs: ['-ver'],
    packages: {
      windows: 'winget install OliverBetz.ExifTool',
      darwin: 'brew install exiftool',
      debian: 'sudo apt install libimage-exiftool-perl',
      arch: 'sudo pacman -S perl-image-exiftool',
    },
  },
];

type Platform = 'windows' | 'darwin' | 'debian' | 'arch' | 'unknown';

/**
 * Load the engine path overrides the way Next.js will, so this report and the
 * running app cannot disagree about which binary is in play.
 *
 * `process.loadEnvFile` would do this, but it only exists from Node 20.12 and
 * `.nvmrc` pins major 20, which includes 20.11 — so it is parsed by hand. The
 * precedence matches Next: a real environment variable always wins, and
 * `.env.local` only fills in what the shell did not provide.
 */
function loadEngineEnvOverrides(cwd: string): void {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(cwd, file);
    if (!existsSync(full)) continue;

    let contents: string;
    try {
      contents = readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith('#')) continue;

      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;

      const key = match[1] as string;
      let value = (match[2] ?? '').trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // A real env var outranks the file, exactly as Next.js treats it.
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

/** Best-effort platform bucket, used only to pick an install hint. */
function detectPlatform(): Platform {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'darwin';

  // Distinguishing Debian from Arch needs a file read, and this script promises
  // to be side-effect free, so `existsSync` on a single well-known path is the
  // cheapest accurate answer. A miss just yields the Debian hint, which is the
  // right guess far more often than not.
  if (existsSync('/etc/arch-release')) return 'arch';
  return 'debian';
}

/** The install command for this engine on this platform. */
function installHint(spec: EngineSpec, platform: Platform): string {
  switch (platform) {
    case 'windows':
      return spec.packages.windows;
    case 'darwin':
      return spec.packages.darwin;
    case 'arch':
      return spec.packages.arch;
    case 'debian':
    case 'unknown':
    default:
      return spec.packages.debian;
  }
}

interface ProbeResult {
  readonly found: boolean;
  /** The binary that answered, either an env override or a PATH name. */
  readonly binary: string | null;
  /** First meaningful line of the version banner. */
  readonly version: string | null;
  /** Candidates tried, for the failure message. */
  readonly tried: readonly string[];
  /**
   * Set when an env override was configured but did not answer. The binary may
   * still be installed on PATH, so this is a misconfiguration warning rather
   * than a reason to stop probing.
   */
  readonly deadOverride: string | null;
}

const TIMEOUT_MS = 5000;

/** Run one binary's version command and summarise the answer. */
function probe(binary: string, args: readonly string[]): { version: string | null } {
  const result = spawnSync(binary, [...args], {
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    // Never hand a PATH entry to a shell.
    shell: false,
    windowsHide: true,
  });

  // A non-zero exit is still useful: some binaries (LibRaw's dcraw_emu in
  // particular) print their banner and exit non-zero. Output is preferred over
  // exit code. Only a spawn-level failure (ENOENT, EACCES, timeout) with no
  // captured output counts as "not found".
  const raw = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const line = raw
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);

  // Spawn-level error with no output → not found.
  // Spawn-level error with output → the binary answered; treat it as found.
  // No spawn-level error → trust the output (may be null, which is fine).
  if (result.error && line === undefined) return { version: null };
  return { version: line ?? null };
}

/**
 * Candidates to try on this platform, in order.
 *
 * `convert` is dropped on Windows because it is a reserved system binary:
 * `C:\Windows\System32\convert.exe` is the FAT-to-NTFS disk conversion tool
 * and it shadows ImageMagick 6's `convert` on PATH. Probing it would let a
 * stock Windows box report ImageMagick as present. ImageMagick 7 on Windows
 * always ships `magick.exe`, so nothing is lost by skipping it.
 */
function candidatesFor(spec: EngineSpec, platform: Platform): string[] {
  if (platform === 'windows') return spec.candidates.filter((name) => name !== 'convert');
  return [...spec.candidates];
}

/** Probe one engine, honouring its env override before searching PATH. */
function probeEngine(spec: EngineSpec, platform: Platform): ProbeResult {
  const candidates = candidatesFor(spec, platform);
  const override = spec.envVar ? process.env[spec.envVar]?.trim() : undefined;
  const tried: string[] = [];

  if (override && override.length > 0) {
    tried.push(override);
    const { version } = probe(override, spec.versionArgs);
    if (version) {
      return { found: true, binary: override, version, tried, deadOverride: null };
    }
    // A configured path that does not answer is a misconfiguration worth
    // reporting, but it must not mask a binary that is installed on PATH and
    // working — otherwise upgrading ImageMagick would appear to "break" a
    // machine that can in fact convert images.
    for (const candidate of candidates) {
      tried.push(candidate);
      const fallback = probe(candidate, spec.versionArgs);
      if (fallback.version) {
        return {
          found: true,
          binary: candidate,
          version: fallback.version,
          tried,
          deadOverride: override,
        };
      }
    }
    return { found: false, binary: null, version: null, tried, deadOverride: override };
  }

  for (const candidate of candidates) {
    tried.push(candidate);
    const { version } = probe(candidate, spec.versionArgs);
    if (version) {
      return { found: true, binary: candidate, version, tried, deadOverride: null };
    }
  }

  return { found: false, binary: null, version: null, tried, deadOverride: null };
}

const useColor = process.stdout.isTTY === true && process.env.NO_COLOR === undefined;
const paint = (code: string, text: string): string =>
  useColor ? `\u001B[${code}m${text}\u001B[0m` : text;
const green = (t: string): string => paint('32', t);
const red = (t: string): string => paint('31', t);
const yellow = (t: string): string => paint('33', t);
const dim = (t: string): string => (useColor ? `\u001B[2m${t}\u001B[0m` : t);
const bold = (t: string): string => paint('1', t);

function main(): number {
  const platform = detectPlatform();

  // Load the same overrides Next.js will, so the report matches the app.
  loadEngineEnvOverrides(process.cwd());

  process.stdout.write(`\n${bold('Camerlob — native engine check')}\n`);
  process.stdout.write(`${dim(`platform: ${process.platform} (${platform})`)}\n`);
  process.stdout.write(`${dim(`node:     ${process.version}`)}\n\n`);

  const missingCritical: string[] = [];
  const missingOptional: string[] = [];

  for (const spec of ENGINES) {
    const result = probeEngine(spec, platform);

    if (result.found) {
      process.stdout.write(
        `  ${green('FOUND')}    ${spec.name.padEnd(13)} ${result.version ?? '(version unknown)'}\n`
      );
      process.stdout.write(`${dim(`             ${result.binary}`)}\n`);
      if (result.deadOverride) {
        // The engine works, but the pinned path does not. The app would try the
        // dead path first, so this is worth a line even though the engine is OK.
        process.stdout.write(
          `${yellow(`             ${spec.envVar}=${result.deadOverride} is set but not answering`)}\n`
        );
      }
      continue;
    }

    const bucket = spec.critical ? missingCritical : missingOptional;
    bucket.push(spec.name);

    const marker = spec.critical ? red('MISSING') : yellow('MISSING');
    process.stdout.write(`  ${marker}  ${spec.name.padEnd(13)} ${dim('not found on PATH')}\n`);
    process.stdout.write(`${dim(`             tried: ${result.tried.join(', ')}`)}\n`);
    if (result.deadOverride) {
      process.stdout.write(
        `${yellow(`             ${spec.envVar}=${result.deadOverride} is set but not answering`)}\n`
      );
    }
    process.stdout.write(`             install: ${installHint(spec, platform)}\n`);
  }

  process.stdout.write('\n');

  if (missingCritical.length > 0) {
    process.stdout.write(
      `${red('Critical engines missing:')} ${missingCritical.join(', ')}\n` +
        `${dim('These gate whole format families. See Documents/MANUAL-INSTALL.md.')}\n`
    );
  } else {
    process.stdout.write(`${green('All critical engines present.')}\n`);
  }

  if (missingOptional.length > 0) {
    process.stdout.write(
      `${yellow('Optional engines missing:')} ${missingOptional.join(', ')}\n` +
        `${dim('Camerlob still runs; the matching formats are reported as unavailable.')}\n`
    );
  }

  process.stdout.write('\n');
  return missingCritical.length > 0 ? 1 : 0;
}

process.exitCode = main();
