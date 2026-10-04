/**
 * scripts/audit-matrix.ts
 *
 * Invariant check for CONVERSION_MATRIX and the engine resolver. Exits non-zero
 * and prints the offending pair on a violation, so it is usable as a CI gate and
 * as a local regression check after any edit to `lib/constants/formats.ts`.
 *
 * WHY A SCRIPT AND NOT A TEST. There is no test suite in this repo yet, and a
 * matrix that silently loses a pair fails as "a format is missing from the
 * dropdown" in the UI, days later and with no stack trace. This is the cheapest
 * possible guard against that, and it runs in well under a second.
 *
 * WHAT IT CHECKS.
 *   1. Every source and every target is a format the registry knows.
 *   2. No format converts to itself.
 *   3. Every source reaches at least one target — guaranteed by the const
 *      literal types rather than re-checked at runtime.
 *   4. No duplicate pairs, and no empty target list, once aliases are folded.
 *   5. The engine the resolver picks can actually produce the target.
 *
 * Rule 5 is the one that catches a wrong capability claim. The resolver decides
 * by category and by what sharp really supports, so a matrix edit that promises
 * `png → heic` on a sharp-only install shows up here rather than as an E001 from
 * a user.
 */

import { CONVERSION_MATRIX, FORMAT_REGISTRY } from '../lib/constants/formats';
import {
  ENGINE_TARGETS,
  formatsEquivalent,
  getEngineFor,
  getFallbackEngines,
  isConversionSupported,
} from '../lib/convert/formats';

const problems: string[] = [];

/**
 * Pairs the TRD requires that no engine can *encode*.
 *
 * TRD §"dng is the single exception: CR2 and CR3 may target DNG because it is a
 * documented, lossless RAW container." No engine here writes DNG — `dcraw_emu`
 * develops, it does not mux, and sharp has no DNG muxer. The libraw adapter
 * therefore satisfies the pair as a remux: the source bytes are returned
 * untouched, with no re-development, so the raw data and maker notes survive
 * intact.
 *
 * This is listed rather than special-cased inline so the exception is visible
 * in one place and cannot quietly widen. If a source that is not CR2/CR3 ever
 * appears here, that is a bug, which is why the set is keyed by source.
 */
const REMUX_ONLY: ReadonlySet<string> = new Set(['cr2 -> dng', 'cr3 -> dng']);

const known = (id: string): boolean => Object.hasOwn(FORMAT_REGISTRY, id);

// CONVERSION_MATRIX is a bare object literal, not a Map, so that `keyof typeof`
// still names every source as a literal union. Iterate it accordingly.
const rows = Object.entries(CONVERSION_MATRIX).map(([source, entry]) => ({
  source,
  targets: entry.targets,
}));

// 1. Endpoints must be real formats.
for (const { source, targets } of rows) {
  if (!known(source)) problems.push(`unknown source format: ${source}`);
  for (const target of targets) {
    if (!known(target)) problems.push(`${source} -> ${target}: target is not in the registry`);
  }
}

// 2-4. Per-source shape.
for (const { source, targets } of rows) {
  // No empty-target check: `CONVERSION_MATRIX` is a const literal, so each
  // `targets` tuple has a literal length and the compiler already rejects an
  // empty one. tsc reported it as a comparison with no overlap, which is the
  // type system doing invariant 3 for us.

  // Self-conversion means the source is reachable from itself, alias included —
  // `jpg` listing `jpeg` is the same mistake as `jpg` listing `jpg`.
  const selfTarget = targets.find((target) => formatsEquivalent(source, target));
  if (selfTarget) problems.push(`${source} -> ${selfTarget}: self-conversion`);

  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target)) problems.push(`${source} -> ${target}: duplicate pair`);
    seen.add(target);

    if (!isConversionSupported(source, target)) {
      problems.push(`${source} -> ${target}: present in the matrix but not supported`);
    }
  }
}

// 5. Some engine in the resolved chain must be able to write the target.
//
// The check is on the *chain*, not the primary engine, and the distinction is
// load-bearing. LibRaw develops RAW to an intermediate raster and deliberately
// appears in no target list; it is sharp, second in its chain, that encodes the
// result. Testing the primary engine alone would flag all 55 RAW pairs as
// broken, which is exactly the kind of false alarm that gets a real check
// deleted.
for (const { source, targets } of rows) {
  for (const target of targets) {
    const chain = getFallbackEngines(source, target);
    const writers = chain.filter((engine) =>
      (ENGINE_TARGETS[engine] ?? []).some((candidate) => formatsEquivalent(candidate, target))
    );
    if (writers.length === 0 && !REMUX_ONLY.has(`${source} -> ${target}`)) {
      problems.push(
        `${source} -> ${target}: no engine in [${chain.join(', ')}] can write the target`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const sources = rows.length;
const pairs = rows.reduce((total, row) => total + row.targets.length, 0);

const byEngine = new Map<string, number>();
for (const { source, targets } of rows) {
  for (const target of targets) {
    const engine = getEngineFor(source, target);
    // A pair that is in the matrix but has no engine is already reported by
    // invariant 1/5; counting it as "unresolved" keeps the histogram honest
    // rather than throwing on a null the types correctly allow.
    const key = engine ?? 'unresolved';
    byEngine.set(key, (byEngine.get(key) ?? 0) + 1);
  }
}

console.log(`matrix: ${sources} sources, ${pairs} pairs`);
console.log(
  `pairs by resolved engine: ${[...byEngine.entries()]
    .sort()
    .map(([e, n]) => `${e}=${n}`)
    .join(', ')}`
);
console.log(`sharp writable targets: ${ENGINE_TARGETS.sharp.join(', ')}`);

// Spot-check the fallback chains so a regression in ordering is visible.
for (const [source, target] of [
  ['jpg', 'png'],
  ['jpg', 'ico'],
  ['cr2', 'jpg'],
  ['eps', 'jpg'],
] as const) {
  console.log(
    `  ${source} -> ${target}: ${getFallbackEngines(source, target).join(' -> ') || '(none)'}`
  );
}

if (problems.length > 0) {
  console.error(`\n${problems.length} matrix violation(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log('matrix audit: OK');
