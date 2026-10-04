/**
 * lib/utils/file-size.ts
 * Human-readable byte formatting. Used by the file card, the result card and
 * the batch summary, so the rounding rule must be identical in all three.
 *
 * Boundaries are covered by tests/unit/file-size.test.ts.
 */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Format a byte count as e.g. `24.8 MB`.
 *
 * Bytes are never fractional. Every unit above bytes keeps one decimal place,
 * except the TB unit, which is rounded to avoid `1024.0 GB`-style noise.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const unit = UNITS[exponent] ?? 'B';
  const value = bytes / 1024 ** exponent;

  // Bytes are whole numbers; there is no such thing as 1.5 B.
  if (exponent === 0) return `${Math.round(value)} ${unit}`;

  const places = unit === 'TB' ? 0 : decimals;
  return `${value.toFixed(places)} ${unit}`;
}

/** Format a signed delta, e.g. `-42%` or `+8%`. */
export function formatDeltaPercent(originalBytes: number, outputBytes: number): string {
  if (originalBytes <= 0) return '0%';
  const delta = ((outputBytes - originalBytes) / originalBytes) * 100;
  const rounded = Math.round(Math.abs(delta));
  if (rounded === 0) return '0%';
  return delta < 0 ? `-${rounded}%` : `+${rounded}%`;
}

/** Describe how much smaller the output is, as copy for the result card. */
export function describeSizeChange(originalBytes: number, outputBytes: number): string {
  if (originalBytes <= 0) return 'Same size';
  const percent = Math.round(Math.abs(((outputBytes - originalBytes) / originalBytes) * 100));
  if (percent === 0) return 'Same size';
  return outputBytes < originalBytes ? `${percent}% smaller` : `${percent}% larger`;
}

/** Sum a list of byte counts. Returns 0 for an empty list. */
export function totalBytes(sizes: readonly number[]): number {
  return sizes.reduce((sum, size) => sum + (Number.isFinite(size) ? size : 0), 0);
}

/** Convert megabytes to bytes using the binary definition (1 MB = 1024²). */
export function megabytesToBytes(megabytes: number): number {
  return Math.round(megabytes * 1024 * 1024);
}
