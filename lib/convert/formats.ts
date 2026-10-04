/**
 * lib/convert/formats.ts
 * Conversion matrix query helpers.
 *
 * `CONVERSION_MATRIX` itself lives in `lib/constants/formats.ts` so that the
 * registry and the matrix cannot drift apart. This module adds the *logic* the
 * registry deliberately does not contain: pair validation, target resolution
 * and engine resolution.
 *
 * The file is framework-free. It imports nothing from Next.js, React or the
 * filesystem, so a CLI, a daemon or a desktop shell can use it unchanged.
 */

import {
  CONVERSION_MATRIX,
  ONE_WAY_FORMATS,
  RAW_FORMATS,
  SOURCE_FORMATS,
  SOURCE_ONLY_FORMATS,
  TARGET_FORMATS,
  getFormatMeta,
  isKnownSource,
} from '@/lib/constants/formats';
import { ConversionError } from '@/lib/constants/errors';
import type { EngineKind, EngineName } from '@/types/engine';
import type { TargetFormat } from '@/types/conversion';

export type { TargetFormat };

/** One valid conversion pair, with everything the router needs. */
export interface ResolvedPair {
  readonly source: string;
  readonly target: string;
  /** Engine named by the matrix row. */
  readonly engine: EngineKind;
  /** True when the pair may only be exported in this direction. */
  readonly oneWay: boolean;
  /** Why the pair is one-way, when it is. */
  readonly reason: string | null;
  /** True when the browser can service this pair without a server. */
  readonly clientCapable: boolean;
  /** Size of the target's format family, used for group headings. */
  readonly targetCategory: string;
}

/** True when `source` may convert to `target`. Never throws. */
export function isConvertible(source: string, target: string): boolean {
  const normalisedSource = source.toLowerCase();
  if (!isKnownSource(normalisedSource)) return false;
  const row = CONVERSION_MATRIX[normalisedSource];
  return (row.targets as readonly string[]).includes(target.toLowerCase());
}

/** Targets available for a source, in matrix order. */
export function getTargetsFor(source: string): readonly string[] {
  const normalised = source.toLowerCase();
  if (!isKnownSource(normalised)) return [];
  return CONVERSION_MATRIX[normalised].targets;
}

/**
 * Validate a pair and return its resolution.
 *
 * @throws ConversionError E001 when the pair is not in the matrix, including
 *   the case where the target is a source-only family such as RAW or PSD.
 */
export function resolvePair(source: string, target: string): ResolvedPair {
  const normalisedSource = source.toLowerCase();
  const normalisedTarget = target.toLowerCase();

  if (!isKnownSource(normalisedSource)) {
    throw new ConversionError('E001', `Unknown source format: ${normalisedSource}`, {
      format: normalisedSource,
    });
  }

  // Naming a source-only family as a target is the most common user error, so
  // it gets its own explanation.
  if (SOURCE_ONLY_FORMATS.includes(normalisedTarget)) {
    throw new ConversionError(
      'E001',
      `${normalisedTarget} is a source-only format and cannot be a conversion target`,
      { format: normalisedTarget }
    );
  }

  if (!isConvertible(normalisedSource, normalisedTarget)) {
    throw new ConversionError(
      'E001',
      `No matrix row for ${normalisedSource} -> ${normalisedTarget}`,
      { format: getFormatMeta(normalisedSource).label }
    );
  }

  const row = CONVERSION_MATRIX[normalisedSource] as {
    readonly targets: readonly string[];
    readonly engine: string;
    readonly oneWay?: boolean;
    readonly reason?: string;
  };

  return {
    source: normalisedSource,
    target: normalisedTarget,
    engine: row.engine as EngineKind,
    oneWay: row.oneWay === true,
    reason: row.reason ?? null,
    clientCapable:
      row.engine.startsWith('CLIENT_') && getFormatMeta(normalisedTarget).clientSupport,
    targetCategory: getFormatMeta(normalisedTarget).category,
  };
}

/**
 * Engine precedence for a pair: the matrix engine first, then the fallbacks the
 * router is allowed to try in order. Raw and vector sources fall back to
 * ImageMagick because it is the only engine that handles a malformed header.
 */
export function getEngineFallbacks(source: string, target: string): readonly EngineKind[] {
  const normalised = source.toLowerCase();
  if (!isKnownSource(normalised)) return [];
  const primary = CONVERSION_MATRIX[normalised].engine as EngineKind;

  const fallbacks = new Set<EngineKind>([primary]);
  if (primary === 'SERVER_LIBRAW') fallbacks.add('SERVER_IMAGEMAGICK');
  if (primary === 'SERVER_GHOSTSCRIPT') fallbacks.add('SERVER_IMAGEMAGICK');
  if (primary === 'CLIENT_WASM') fallbacks.add('CLIENT_CANVAS');
  if (primary.startsWith('CLIENT_')) fallbacks.add('SERVER_SHARP');
  if (primary === 'SERVER_SHARP') fallbacks.add('SERVER_IMAGEMAGICK');

  // Only keep fallbacks that can actually write the target.
  return [...fallbacks].filter((engine) => engineCanEncode(engine, target));
}

/** True when the engine is declared able to write `target`. */
export function engineCanEncode(engine: EngineKind, target: string): boolean {
  const normalised = target.toLowerCase();
  switch (engine) {
    case 'CLIENT_WASM':
    case 'CLIENT_CANVAS':
      return getFormatMeta(normalised).clientSupport && normalised !== 'pdf';
    case 'CLIENT_HEIC':
      return normalised === 'jpg' || normalised === 'png' || normalised === 'webp';
    case 'SERVER_SHARP':
      return (
        !SOURCE_ONLY_FORMATS.includes(normalised) &&
        normalised !== 'pdf' &&
        !RAW_FORMATS.includes(normalised)
      );
    case 'SERVER_IMAGEMAGICK':
      return true;
    case 'SERVER_LIBRAW':
      return false;
    case 'SERVER_GHOSTSCRIPT':
      return normalised === 'pdf';
    default:
      return false;
  }
}

/** Serialisable matrix payload for `GET /api/formats`. */
export function serialiseMatrix() {
  return {
    sources: Object.keys(CONVERSION_MATRIX).map((id) => ({
      id,
      label: getFormatMeta(id).label,
    })),
    targets: TARGET_FORMATS.map((id) => ({
      id,
      label: getFormatMeta(id).label,
    })),
    pairs: Object.fromEntries(
      Object.entries(CONVERSION_MATRIX).map(([id, row]) => [id, [...row.targets]])
    ),
    engines: Object.fromEntries(
      Object.entries(CONVERSION_MATRIX).map(([id, row]) => [id, row.engine])
    ),
    oneWay: { ...ONE_WAY_FORMATS },
  };
}

// ---------------------------------------------------------------------------
// The `EngineName` view of the matrix.
//
// The registry above stores one engine per *source row*, because the source
// decides what has to be decoded: a CR2 cannot be read without LibRaw no matter
// what the target is. But the target decides what has to be *written*, and those
// are different engines. `jpg -> png` is a pure sharp job; `jpg -> ico` needs
// ImageMagick, because sharp cannot write an icon. Storing a single engine per
// row would therefore have to either over-promise (naming the client engine for
// `jpg -> ico`, which cannot work) or hide the real answer in a predicate.
//
// So the per-target engine is *derived* here, from the row's engine plus a
// target-capability table. Deriving rather than duplicating is the point: the
// matrix stays a single frozen literal in `lib/constants/formats.ts`, and there
// is no second copy of it to drift.
// ---------------------------------------------------------------------------

/**
 * Ghostscript is a *rasteriser*, not an encoder for most of its targets.
 *
 * `gs` turns EPS/PS/XPS into a raster; it can only write a target natively for
 * PNG, TIFF and PDF (`pdfwrite`). For anything else the adapter rasterises with
 * Ghostscript and then hands the raster to sharp. So Ghostscript is the named
 * engine for the whole PostScript row, exactly as LibRaw is for RAW, and the
 * second stage stays an internal detail of the adapter.
 */
const GHOSTSCRIPT_TARGETS: readonly string[] = ['jpg', 'png', 'webp', 'tiff', 'pdf'];

/**
 * Targets each engine can write, in the short `EngineName` vocabulary.
 *
 * These lists were derived from the *installed* sharp build, not from its
 * documentation, because the two disagree. Verified against `sharp.format`,
 * by round-tripping real fixtures, and by encoding a test image to every
 * candidate target:
 *
 *   sharp can read : jpeg, png, webp, tiff, gif, heif (avif + heic), svg
 *   sharp can write: jpeg, png, webp, tiff, gif, and heif as AVIF only
 *
 * AVIF is written through the `heif` encoder with `compression: 'av1'`; there
 * is no separate avif entry. HEIC is readable but *not* writable — this libvips
 * has no HEVC encoder, so `.heif({ compression: 'hevc' })` fails. BMP and ICO
 * are neither readable nor writable (`sharp(...).bmp is not a function`). All
 * of those are therefore ImageMagick's job in at least one direction.
 */
/**
 * Exported so `scripts/audit-matrix.ts` can check the matrix against the same
 * capability table the resolver uses, rather than against the older
 * `engineCanEncode` switch, which predates the sharp audit and still claims
 * sharp can write BMP and HEIC.
 */
export const ENGINE_TARGETS: Readonly<Record<EngineName, readonly string[]>> = {
  // The workhorse. In-process, so no spawn and no temp file.
  sharp: ['jpg', 'png', 'webp', 'avif', 'gif', 'tiff'],
  // The universal fallback: the only engine with delegates for BMP, ICO, PDF
  // and the layered/professional containers.
  imagemagick: ['jpg', 'png', 'webp', 'avif', 'gif', 'tiff', 'bmp', 'ico', 'heic', 'pdf'],
  // LibRaw develops RAW to a raster; it does not encode a target format itself.
  // The router pairs it with sharp, so it appears in no target list.
  libraw: [],
  // Ghostscript can only read PostScript and PostScript-adjacent containers.
  // Naming it for any other source would be a claim the adapter cannot honour.
  ghostscript: GHOSTSCRIPT_TARGETS,
  // What a browser can encode through a canvas. Kept for the client bridge in
  // `client-converter.ts`; the server router never resolves to it, because a
  // server is by definition present when a request arrives.
  client: ['jpg', 'png', 'webp', 'gif'],
};

/**
 * Sources sharp can actually decode.
 *
 * This is the single most consequential list in the file. A source that sharp
 * cannot open must never be routed to it, no matter that sharp is the fastest
 * encoder for the target: `bmp -> png` is an ImageMagick job, because sharp
 * raises "unsupported image format" on the very first byte of a BMP.
 */
const SHARP_READABLE: readonly string[] = [
  'jpg',
  'jpeg',
  'jfif',
  'png',
  'webp',
  'avif',
  'gif',
  'tiff',
  'tif',
  'heic',
  'heif',
];

/**
 * The server-side decoder for a matrix row.
 *
 * Unlike the plain `EngineName` bridge in `detect.ts`, this collapses the
 * *client* kinds onto sharp rather than onto `client`, because the question
 * being answered here is "which server engine reads this", not "which adapter
 * handles it in a browser".
 *
 * A row saying `CLIENT_WASM` only asserts that a *browser* can decode the
 * format, which says nothing about the server. BMP, ICO, TGA and PPM are all
 * marked `CLIENT_WASM` because every browser decodes them for free, and none of
 * them are readable by this sharp build — so those rows are corrected to
 * ImageMagick here rather than being routed into a guaranteed failure.
 */
function serverDecoderFor(kind: EngineKind, source: string): EngineName {
  const declared = SERVER_DECODER[kind];
  if (declared === 'sharp' && !SHARP_READABLE.includes(source)) return 'imagemagick';
  return declared;
}

/**
 * Every valid target for a source, each with the engine that writes it.
 *
 * This is the shape `GET /api/formats` and `GET /api/formats/[format]` return,
 * and the shape the target picker consumes.
 *
 * @returns One entry per valid target, in matrix order. Empty for an unknown
 *   source, so a caller can render an empty list without special-casing.
 */
export function getTargets(source: string): TargetFormat[] {
  const normalised = source.toLowerCase();
  if (!isKnownSource(normalised)) return [];

  const row = CONVERSION_MATRIX[normalised] as {
    readonly targets: readonly string[];
    readonly engine: string;
  };
  const sourceEngine = serverDecoderFor(row.engine as EngineKind, normalised);

  return (
    row.targets
      // A format never converts to itself; the matrix should not say so, but
      // filtering here means a future edit cannot create a self-conversion.
      .filter((target) => target !== normalised)
      .map((target) => ({ to: target, engine: resolveTargetEngine(sourceEngine, target) }))
  );
}

/**
 * Containers sharp has no encoder for, verified against the installed build.
 * A target here always forces ImageMagick to the front of the chain.
 */
const IMAGEMAGICK_ONLY_TARGETS: readonly string[] = ['ico', 'bmp', 'pdf', 'heic', 'heif'];

/**
 * The decoder for each matrix row, in the short `EngineName` vocabulary.
 *
 * The registry stores `CLIENT_WASM` for raster rows because that is the right
 * answer for the *browser* pipeline: a browser decodes a PNG for free. This
 * table is the server-side view, where the same rows are sharp's work. The
 * specialised rows — RAW, PostScript, layered — keep their server engine,
 * because those genuinely cannot be read by anything else.
 */
const SERVER_DECODER: Readonly<Record<EngineKind, EngineName>> = {
  CLIENT_WASM: 'sharp',
  CLIENT_CANVAS: 'sharp',
  CLIENT_HEIC: 'sharp',
  SERVER_SHARP: 'sharp',
  SERVER_IMAGEMAGICK: 'imagemagick',
  SERVER_LIBRAW: 'libraw',
  SERVER_GHOSTSCRIPT: 'ghostscript',
};

/**
 * The engine that will read `source` and write `target`.
 *
 * The row's engine column is a *decoder* hint, and the answer depends on both
 * halves of the job:
 *
 * 1. A source only one engine can read names that engine, whatever the target.
 *    A RAW file is only reachable through LibRaw, an EPS only through
 *    Ghostscript, a PSD only through ImageMagick. Reporting `cr2 -> jpg` as a
 *    sharp job would be a claim the router cannot honour, even though the final
 *    encode really is sharp's. The second stage is an internal detail of the
 *    adapter and deliberately not a matrix fact.
 * 2. Otherwise the source is a plain raster, so sharp reads it — and sharp also
 *    writes every target except the few it has no encoder for.
 * 3. Those few (an `.ico` container, mainly) fall through to ImageMagick, whose
 *    delegates cover essentially everything.
 *
 * @returns The engine, or `null` for an unsupported pair.
 */
function resolveTargetEngine(sourceEngine: EngineName, target: string): EngineName {
  // A source only one engine can read names that engine, whatever the target.
  if (sourceEngine === 'libraw' || sourceEngine === 'ghostscript') return sourceEngine;

  // A layered document (PSD, PSB, XCF, Publisher, OpenDocument) is likewise
  // ImageMagick's alone. This is checked before the sharp-writes check below,
  // because the engine that can *read* the source outranks the engine that can
  // write the target: sharp encodes JPEG perfectly well, but it cannot open a
  // PSD in the first place, so answering "sharp" would be false.
  if (sourceEngine === 'imagemagick') return 'imagemagick';

  // Containers sharp has no encoder for.
  if (IMAGEMAGICK_ONLY_TARGETS.includes(target)) return 'imagemagick';

  // The source is a plain raster, so sharp reads it and — for most targets —
  // writes it too, in one in-process call with no spawn.
  if (ENGINE_TARGETS.sharp.includes(target)) return 'sharp';

  for (const candidate of ['imagemagick', 'ghostscript'] as const) {
    if (ENGINE_TARGETS[candidate].includes(target)) return candidate;
  }

  // Nothing claims this target. ImageMagick is the honest last answer: it is
  // the only engine with delegates broad enough to try.
  return 'imagemagick';
}

/** True when `source -> target` is in the matrix. Never throws. */
export function isConversionSupported(source: string, target: string): boolean {
  return isConvertible(source, target);
}

/**
 * The engine that services a pair, or `null` when the pair is unsupported.
 *
 * Returns `null` rather than throwing so a caller validating a whole list of
 * pairs does not need a try/catch per entry.
 */
export function getEngineFor(source: string, target: string): EngineName | null {
  if (!isConversionSupported(source, target)) return null;
  const entry = getTargets(source).find((candidate) => candidate.to === target.toLowerCase());
  return entry ? entry.engine : null;
}

/**
 * The ordered fallback chain for a pair, primary engine first.
 *
 * A fallback is only included when it can genuinely take over, which means it
 * must be able to *read the source* as well as write the target. That rules out
 * most naive chains: sharp cannot read a PSD, so offering sharp as a fallback
 * for `psd -> png` would burn a process spawn to fail immediately.
 */
export function getFallbackEngines(source: string, target: string): EngineName[] {
  const primary = getEngineFor(source, target);
  if (primary === null) return [];

  const normalisedTarget = target.toLowerCase();
  const chain: EngineName[] = [primary];

  // RAW: only LibRaw can decode a sensor file, and ImageMagick can develop one
  // through its dcraw delegate. sharp is deliberately absent — it cannot read
  // RAW at all, so offering it would spend a process spawn to fail on the first
  // byte. This matches the retry rule in TRD 11: E007 on the LibRaw path gets
  // exactly one retry, on ImageMagick.
  if (primary === 'libraw' || RAW_FORMATS.includes(source.toLowerCase())) {
    if (!chain.includes('imagemagick')) chain.push('imagemagick');
    return chain;
  }

  // Ghostscript rasterises to PNG; sharp finishes the job from there.
  if (primary === 'ghostscript') {
    chain.push('sharp');
    if (ENGINE_TARGETS.imagemagick.includes(normalisedTarget)) chain.push('imagemagick');
    return chain;
  }

  // ImageMagick is the broadest reader, so it is the universal last resort for
  // anything already decoded in-process.
  if (primary === 'sharp' && !chain.includes('imagemagick')) {
    if (ENGINE_TARGETS.imagemagick.includes(normalisedTarget)) chain.push('imagemagick');
  }

  return chain;
}

/** Every legal source identifier, in matrix order. */
export function getAllSourceFormats(): string[] {
  return [...SOURCE_FORMATS];
}

/**
 * Formats a browser can decode on its own.
 *
 * HEIC and HEIF are here because the app ships `heic2any`, which transcodes
 * them in-browser; the browser itself cannot. Anything absent from this list —
 * every RAW, every layered/professional container — needs a server engine, which
 * is why the client bridge must not claim it.
 */
const BROWSER_DECODABLE: readonly string[] = [
  'jpg',
  'jpeg',
  'jfif',
  'png',
  'webp',
  'gif',
  'bmp',
  'ico',
  'tiff',
  'tif',
  'avif',
  'heic',
  'heif',
];

/**
 * Formats a browser can encode through a canvas.
 *
 * A canvas exposes `toBlob` for exactly these three. Everything else — TIFF,
  BMP, AVIF, GIF — has no browser encoder, so a client-side conversion to one of
 * those cannot work no matter how willing the browser is.
 */
const BROWSER_ENCODABLE: readonly string[] = ['jpg', 'png', 'webp'];

/**
 * Whether a browser alone can service a pair.
 *
 * This is the authority for the client/server decision, and both the router's
 * plan and `client-converter.ts` read it, so the two cannot disagree about
 * which conversions are possible without a native binary.
 *
 * Note the deliberate asymmetry with the server matrix: a browser can do far
 * less than ImageMagick can, and it must never be offered a target it cannot
 * encode.
 */
export function canBrowserConvert(source: string, target: string): boolean {
  return (
    BROWSER_DECODABLE.includes(source.toLowerCase()) &&
    BROWSER_ENCODABLE.includes(target.toLowerCase())
  );
}

/** True when a browser can decode this source at all, whatever the target. */
export function canBrowserDecode(source: string): boolean {
  return BROWSER_DECODABLE.includes(source.toLowerCase());
}

/** Every legal target identifier, sorted. `pdf` is here and never a source. */
export function getAllTargetFormats(): string[] {
  return [...TARGET_FORMATS];
}

/**
 * Registry keys that are the same physical format under a different name.
 *
 * The matrix keeps `jpg`, `jpeg` and `jfif` as separate source keys so the
 * picker can preserve whichever spelling a user prefers. That is right for the
 * matrix and wrong for a file dialog: a user who picked "JPG" will still have
 * `holiday.jpeg` on their desktop, and an `accept` list of only `.jpg` would
 * hide it in some pickers.
 */
const ALIAS_GROUPS: ReadonlyArray<readonly string[]> = [
  ['jpg', 'jpeg', 'jfif'],
  ['tiff', 'tif'],
  ['heic', 'heif'],
];

/**
 * Whether two format identifiers name the same physical format.
 *
 * The route compares the format it detected from magic bytes against the format
 * the client declared, and the detector always returns the canonical spelling —
 * `photo.jpeg` detects as `jpg`. A naive string compare would call that a
 * mismatch and reject a perfectly good file with E010, which is how a
 * re-labelling "security" check becomes an ordinary support ticket.
 *
 * Unknown identifiers are equal only to themselves, so this never invents
 * equivalence for a format it has not heard of.
 */
export function formatsEquivalent(left: string, right: string): boolean {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  if (a === b) return true;
  return ALIAS_GROUPS.some((group) => group.includes(a) && group.includes(b));
}

/**
 * Normalise one registry extension into an `accept` token.
 *
 * The HTML `accept` attribute accepts a MIME type or an extension written with
 * a leading dot, and a bare `jpg` is neither: it is not a valid MIME type
 * (no slash), so Chrome discards the token instead of guessing, and the dialog
 * silently degrades to "every file". Windows and macOS dialogs are markedly
 * better at the dotted-extension form, so this is the form that is emitted.
 *
 * This is the single point where the registry's extensions become a file-dialog
 * filter, which is why the dot is *enforced* here rather than assumed to be
 * present in every registry entry. A MIME type is never emitted either: the
 * registry extension lists are authoritative, and a type is not a filter the
 * dialogs honour consistently across platforms.
 */
function asAcceptToken(extension: string): string {
  const lower = extension.trim().toLowerCase();
  if (lower.length === 0) return '';
  return lower.startsWith('.') ? lower : `.${lower}`;
}

/**
 * The `accept` attribute for a file input, given the chosen source format.
 *
 * Returns a comma-separated list of DOTTED EXTENSIONS ONLY — e.g.
 * `.jpg,.jpeg,.jfif` — never a MIME type, for the reason {@link asAcceptToken}
 * gives. Every extension of every alias is included, so the OS file dialog
 * filters correctly without the user having to guess which spelling this app
 * happens to prefer. The chosen format's own extensions come first, and the
 * canonical `jpg` is preferred over `jpeg` so the common case produces the
 * natural `.jpg,.jpeg,.jfif` ordering.
 *
 * @example
 * getAcceptAttribute('jpg');  // '.jpg,.jpeg,.jfif'
 * getAcceptAttribute('avif'); // '.avif'
 * getAcceptAttribute('tiff'); // '.tiff,.tif'
 */
export function getAcceptAttribute(source: string): string {
  const id = source.toLowerCase();
  const own = getFormatMeta(id).extensions;

  // Put the canonical spelling first so the output reads naturally.
  const group = ALIAS_GROUPS.find((candidates) => candidates.includes(id));
  if (!group) return own.map(asAcceptToken).filter(Boolean).join(',');

  const ordered = ['jpg', 'tiff', 'heic'].filter((canonical) => group.includes(canonical));
  const seen = new Set<string>();
  const extensions: string[] = [];

  for (const key of [...ordered, ...group]) {
    for (const extension of getFormatMeta(key).extensions) {
      const token = asAcceptToken(extension);
      if (token === '' || seen.has(token)) continue;
      seen.add(token);
      extensions.push(token);
    }
  }
  return extensions.join(',');
}

/**
 * `AUTO_ACCEPT_ATTRIBUTE` — the `accept` string for a file input in Auto mode.
 *
 * In Manual mode the input is narrowed to the chosen source's extensions, so the
 * OS dialog filters. Auto mode has no chosen source yet, so the list has to be
 * the union of everything the detector can resolve, or the dialog would hide
 * half the formats the app supports before the user has done anything wrong.
 *
 * DERIVED, NOT LISTED. The obvious implementation is a hand-written string of
 * forty extensions, and that string is wrong the moment somebody adds a format:
 * the registry grows, the list does not, and the failure is silent — a RAW
 * extension quietly vanishes from the dialog. Building it from `SOURCE_FORMATS`
 * makes that failure impossible; there is one list, and it is the registry.
 */
export const AUTO_ACCEPT_ATTRIBUTE: string = Object.freeze(
  [...new Set(SOURCE_FORMATS.flatMap((id) => getFormatMeta(id).extensions))].join(',')
);

/**
 * Map a short server engine name onto the {@link EngineKind} the UI stores.
 *
 * `EngineName` and `EngineKind` are deliberately different vocabularies: the
 * first says which binary ran, the second says which adapter object and where it
 * executes. The bridge the server uses (`ENGINE_NAME_OF` in
 * `lib/convert/engines/detect.ts`) is the wrong direction for a browser, and
 * that module spawns child processes — importing it here would pull Node's
 * `child_process` into the client bundle for the sake of a five-entry lookup.
 *
 * `client` maps to `CLIENT_CANVAS` because every browser-capable pair this build
 * can service is a canvas encode; heic2any and the WASM path both produce canvas
 * output, and the label a user sees is the format, not the decoder.
 */
const ENGINE_KIND_OF: Readonly<Record<EngineName, EngineKind>> = Object.freeze({
  sharp: 'SERVER_SHARP',
  imagemagick: 'SERVER_IMAGEMAGICK',
  libraw: 'SERVER_LIBRAW',
  ghostscript: 'SERVER_GHOSTSCRIPT',
  client: 'CLIENT_CANVAS',
});

/**
 * Resolve the {@link EngineKind} for an engine name reported by the API.
 *
 * Unknown names fall back to `SERVER_SHARP` rather than throwing. A result card
 * that cannot name its engine should still render, and sharp is the engine that
 * services the overwhelming majority of pairs, so the guess is right far more
 * often than not and the alternative is a blank pill.
 */
export function engineKindFor(engine: string): EngineKind {
  return ENGINE_KIND_OF[engine as EngineName] ?? 'SERVER_SHARP';
}
