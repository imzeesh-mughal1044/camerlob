/**
 * lib/utils/sanitize-filename.ts
 * Output filename sanitisation.
 *
 * Converted files are downloaded with a name derived from the source name, so
 * the name crosses from untrusted user input into a filesystem path, a ZIP
 * entry name and a Content-Disposition header. Everything here is about making
 * that value safe on Windows, macOS and Linux simultaneously.
 *
 * Covered by tests/unit/sanitize-filename.test.ts.
 */

/** Characters no mainstream filesystem accepts in a filename. */
const ILLEGAL_CHARS = /[<>:"/\\|?*\u0000-\u001F\u007F]/g;

/** Windows device names. Reserved with any extension, in any case. */
const RESERVED_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

/** Longest filename most filesystems accept, extension included. */
const MAX_FILENAME_LENGTH = 200;

/** Placeholder used when sanitisation removes everything. */
const FALLBACK_NAME = 'converted';

/**
 * Reduce an arbitrary string to a safe filename stem.
 *
 * Strips directory components, illegal characters, control characters, leading
 * dots and Windows reserved names, collapses whitespace, and truncates to
 * {@link MAX_FILENAME_LENGTH} without cutting mid-surrogate-pair.
 */
export function sanitizeFilename(input: string): string {
  // Drop any directory component: a name is never a path.
  const withoutPath = input.split(/[/\\]/).pop() ?? '';

  let name = withoutPath
    .replace(ILLEGAL_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    // A leading dot hides the file and a trailing dot or space is illegal on Windows.
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '');

  if (name.length > MAX_FILENAME_LENGTH) {
    name = name.slice(0, MAX_FILENAME_LENGTH).trimEnd();
  }

  if (name.length === 0) return FALLBACK_NAME;

  // Strip the extension before the reserved-name check: NUL.txt is still NUL.
  const stem = name.replace(/\.[^.]*$/, '') || name;
  if (RESERVED_NAMES.has(stem.toLowerCase())) {
    name = `_${name}`;
  }

  return name;
}

/**
 * Build the output filename for a conversion: the sanitised source stem with
 * the target extension, guaranteed unique against `taken` by appending an
 * incrementing counter.
 */
export function buildOutputFilename(
  sourceName: string,
  targetExtension: string,
  taken: ReadonlySet<string> = new Set()
): string {
  const safe = sanitizeFilename(sourceName);

  // Split the extension off the sanitised name so we replace rather than append.
  const dotIndex = safe.lastIndexOf('.');
  const stem = dotIndex > 0 ? safe.slice(0, dotIndex) : safe;
  const ext = targetExtension.startsWith('.') ? targetExtension : `.${targetExtension}`;

  let candidate = `${stem}${ext}`;
  let counter = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${stem}-${counter}${ext}`;
    counter += 1;
  }

  return candidate;
}
