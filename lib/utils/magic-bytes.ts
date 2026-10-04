/**
 * lib/utils/magic-bytes.ts
 * File signature sniffing: the last line of defence against a mislabelled upload.
 *
 * WHY BYTES AND NOT THE DECLARED TYPE
 * ------------------------------------------------------------------------
 * A browser-supplied MIME type is a guess from the file extension, and the
 * extension is whatever the user typed. Neither is evidence. If the server
 * trusted either, then renaming `payload.exe` to `holiday.jpg` would send it to
 * an image decoder, and worse, renaming a 40-megapixel NEF to `avatar.png`
 * would route it to sharp and fail deep inside a native library instead of at
 * the boundary where the mistake is visible. So the server re-derives the format
 * from the bytes and treats the declared value as a claim to be checked.
 *
 * HOW DETECTION IS ORGANISED
 * ------------------------------------------------------------------------
 * Cheap fixed-offset signatures run first and handle the formats that have a
 * real magic number. Formats that share a container need a second, deeper pass:
 *
 * - The ISO-BMFF family (AVIF, HEIC, HEIF) all begin `....ftyp`, so offset 4
 *   alone cannot tell them apart; the *brand* at offset 8 does.
 * - The TIFF family (TIFF, DNG, NEF, ARW, ORF, RW2, PEF) all begin with a
 *   byte-order mark, so the vendor has to be found in the IFD instead.
 * - TGA has no header at all; its only signature is a footer at EOF-18.
 *
 * Order therefore matters and is load-bearing: a generic TIFF match would
 * otherwise shadow every RAW variant that shares its container.
 *
 * WHAT "UNKNOWN" MEANS
 * ------------------------------------------------------------------------
 * Returning `null` is not a failure. TGA has no reliable header, several RAW
 * variants are inconsistently tagged across vendors, and a truncated upload may
 * be too short to classify. `null` means "no evidence either way", and the
 * caller decides: the route treats an undetectable file as acceptable when its
 * extension is plausible, and rejects it only when the bytes positively
 * identify a *different* format. See {@link verifySignature}.
 *
 * Signatures reference Documents/TRD.md 10.4.
 */

import { isKnownSource } from '@/lib/constants/formats';

/** A byte signature: offset, then the exact bytes expected at that offset. */
export interface MagicSignature {
  /** Lowercase canonical format identifier this signature identifies. */
  readonly format: string;
  /** Byte offset to inspect. */
  readonly offset: number;
  /** Expected bytes at `offset`. */
  readonly bytes: readonly number[];
}

/**
 * Signatures matched at a fixed offset, in priority order.
 *
 * First match wins, so specific containers precede the generic ones they share
 * a prefix with. The TIFF entry is deliberately last among the fixed-offset
 * signatures: it is the fallback for the whole family, and the vendor-specific
 * variants are resolved by {@link detectTiffFamily} before it is ever reached.
 */
export const MAGIC_SIGNATURES: readonly MagicSignature[] = [
  // ---- Raster with a real magic number ----
  { format: 'jpg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { format: 'png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { format: 'gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { format: 'bmp', offset: 0, bytes: [0x42, 0x4d] }, // BM
  { format: 'ico', offset: 0, bytes: [0x00, 0x00, 0x01, 0x00] },
  { format: 'psd', offset: 0, bytes: [0x38, 0x42, 0x50, 0x53] }, // 8BPS
  { format: 'xcf', offset: 0, bytes: [0x67, 0x69, 0x6d, 0x70] }, // gimp
  { format: 'pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { format: 'ppm', offset: 0, bytes: [0x50, 0x36] }, // P6 binary
  { format: 'ppm', offset: 0, bytes: [0x50, 0x33] }, // P3 ASCII

  // ---- RIFF: the fourcc at offset 8 is what distinguishes WEBP ----
  { format: 'webp', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF

  // ---- PostScript family: DSC comment must follow %! ----
  { format: 'eps', offset: 0, bytes: [0x25, 0x21, 0x50, 0x53, 0x2d, 0x41, 0x64, 0x6f, 0x62, 0x65] }, // %!PS-Adobe

  // ---- Camera RAW with a vendor-specific header, checked before TIFF ----
  { format: 'raf', offset: 0, bytes: [0x46, 0x55, 0x4a, 0x49, 0x46, 0x49, 0x4c, 0x4d] }, // FUJIFILM
  { format: 'x3f', offset: 0, bytes: [0x46, 0x4f, 0x56, 0x62] }, // FOVb
  { format: 'orf', offset: 0, bytes: [0x49, 0x49, 0x52, 0x4f] }, // IIRO
  { format: 'orf', offset: 0, bytes: [0x4d, 0x4d, 0x4f, 0x52] }, // MMOR
  { format: 'rw2', offset: 0, bytes: [0x49, 0x49, 0x55, 0x00] }, // IIU\0

  // ---- ZIP container: XPS and CR3 both live here, disambiguated later ----
  { format: 'zip', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },

  // ---- TIFF family fallback. Last, because every member shares it. ----
  { format: 'tiff', offset: 0, bytes: [0x49, 0x49, 0x2a, 0x00] }, // II*\0
  { format: 'tiff', offset: 0, bytes: [0x4d, 0x4d, 0x00, 0x2a] }, // MM\0*
];

/**
 * ISO-BMFF brands, mapped to a canonical format.
 *
 * Read at offset 8, the four bytes after `ftyp`. The distinction matters: an
 * AVIF and an HEIC are both `ftyp` containers, and a plain MP4 is too, so a
 * detector that stops at offset 4 will happily call a video file an AVIF.
 */
const ISO_BMFF_BRANDS: Readonly<Record<string, string>> = {
  avif: 'avif',
  avis: 'avif',
  av01: 'avif',
  heic: 'heic',
  heix: 'heic',
  hevc: 'heic',
  hevx: 'heic',
  heim: 'heic',
  heis: 'heic',
  hevm: 'heic',
  hevs: 'heic',
  mif1: 'heic',
  msf1: 'heic',
};

/**
 * Vendor make strings found in a TIFF IFD, mapped to a RAW format.
 *
 * The TIFF byte-order mark is shared by TIFF and by most RAW containers, so the
 * vendor is the only reliable discriminator. Keys are uppercase and matched
 * case-insensitively against the make/model tags.
 */
const TIFF_VENDOR_MAKES: ReadonlyArray<readonly [string, string]> = [
  ['NIKON', 'nef'],
  ['SONY', 'arw'],
  ['PENTAX', 'pef'],
  ['RICOH', 'pef'],
  ['OLYMPUS', 'orf'],
  ['OM DIGITAL', 'orf'],
  ['PANASONIC', 'rw2'],
  ['LEICA', 'rw2'],
  ['CANON', 'cr2'],
  ['HASSELBLAD', '3fr'],
  ['MINOLTA', 'mrw'],
  ['KODAK', 'dcr'],
  ['EPSON', 'erf'],
  ['LEAF', 'mos'],
  ['SIGMA', 'x3f'],
  ['FUJIFILM', 'raf'],
];

/**
 * Vendor strings that positively identify a DNG.
 *
 * DNG needs a list rather than a single make because Adobe wrote the format to
 * be vendor-neutral: a DNG can come from a Leica, a Ricoh or a phone. The `DNG`
 * tag itself is the reliable signal, so it is checked separately.
 */
const DNG_TAGS: readonly string[] = ['DNGVERSION', 'UNIQUE CAMERA MODEL', 'DNGBACKWARDVERSION'];

/** The RIFF signature, resolved by name rather than by array index. */
const RIFF_SIGNATURE: MagicSignature = {
  format: 'webp',
  offset: 0,
  bytes: [0x52, 0x49, 0x46, 0x46],
};

/** Little-endian TIFF: `II` then 42. */
const TIFF_SIGNATURE_LE: MagicSignature = {
  format: 'tiff',
  offset: 0,
  bytes: [0x49, 0x49, 0x2a, 0x00],
};

/** Big-endian TIFF: `MM` then 42. */
const TIFF_SIGNATURE_BE: MagicSignature = {
  format: 'tiff',
  offset: 0,
  bytes: [0x4d, 0x4d, 0x00, 0x2a],
};

/**
 * Identify a file from its leading bytes.
 *
 * Only the first 64 KB is inspected for the fixed-offset pass. The deeper
 * container passes need more: a TIFF IFD with an embedded maker note can put the
 * make tag well past 12 bytes, and a ZIP central directory lives at the end of
 * the archive. Reading further is still cheap next to the file itself, and the
 * alternative is misrouting a 60-megabyte RAW file.
 *
 * @returns the canonical format identifier, or `null` when nothing matches.
 */
export function detectFormatFromBuffer(buffer: Buffer): string | null {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  // Short files cannot carry a signature; report unknown rather than guessing.
  if (buffer.length < 4) return null;

  const head = buffer.subarray(0, Math.min(buffer.length, 64 * 1024));

  // RIFF needs its fourcc, which the fixed pass cannot check on its own.
  if (matchesAt(head, RIFF_SIGNATURE)) {
    const fourcc = ascii(head, 8, 4);
    if (fourcc === 'WEBP') return 'webp';
    // Another RIFF flavour (AVI, WAV). Not a format we claim to convert.
    return null;
  }

  // The TIFF family is resolved before the fixed pass, because its own
  // signature is only the byte-order mark and would otherwise shadow every RAW
  // variant that shares the container. Both TIFF signatures are checked here.
  if (matchesAt(head, TIFF_SIGNATURE_LE) || matchesAt(head, TIFF_SIGNATURE_BE)) {
    return detectTiffFamily(head);
  }

  for (const signature of MAGIC_SIGNATURES) {
    // Both were handled above, with a deeper pass than the table can express.
    if (signature.format === 'webp' || signature.format === 'tiff') continue;
    if (!matchesAt(head, signature)) continue;

    const detected = signature.format;

    if (detected === 'zip') {
      return detectZipFamily(buffer);
    }
    return detected;
  }

  // `ftyp` never appears in MAGIC_SIGNATURES on its own, because it is only
  // meaningful together with the brand that follows it.
  if (ascii(head, 4, 4) === 'ftyp') {
    const brand = ascii(head, 8, 4).toLowerCase();
    return ISO_BMFF_BRANDS[brand] ?? null;
  }

  // TGA's only signature is a footer, so it is the last thing tried.
  if (looksLikeTarga(buffer)) return 'tga';

  return null;
}

/**
 * Resolve a member of the TIFF family by reading its IFD.
 *
 * A full IFD walk is unnecessary and would be slow on a 60 MB file. Camera
 * vendors reliably put the make and model in the first few dozen tags, so the
 * first 64 KB is scanned for the vendor strings instead of parsed. That is a
 * deliberate trade: a heuristic with a bounded cost, rather than an exact parse
 * that has to seek through the whole file.
 *
 * @returns the RAW format, `dng` when the DNG tags are present, `tiff` when the
 *   container is a plain TIFF, or `null` when the family is recognised but the
 *   vendor is not one we map.
 */
function detectTiffFamily(head: Buffer): string | null {
  const haystack = head.toString('latin1').toUpperCase();

  // A DNG is a TIFF, so it must be tested before the generic TIFF answer and
  // before any vendor make, since a DNG can carry a camera's make string.
  if (DNG_TAGS.some((tag) => haystack.includes(tag))) return 'dng';

  for (const [vendor, format] of TIFF_VENDOR_MAKES) {
    if (haystack.includes(vendor)) return format;
  }

  // Canon CR2 is a TIFF whose make tag reads "Canon", covered above. Canon CR3
  // is a different beast: a QuickTime-style ISO-BMFF box that the fixed pass
  // rejects, so `detectZipFamily` is the only place it can be identified.
  //
  // An unmapped TIFF vendor is still a plain TIFF as far as this app is
  // concerned: the file is a valid TIFF, and routing it to sharp is correct.
  return 'tiff';
}

/**
 * Resolve a ZIP-container format.
 *
 * Two supported formats are ZIPs: CR3, which is a QuickTime-style box that
 * happens to embed an `ftyp`, and XPS, which is an OPC package. Both are
 * distinguished by a marker string rather than by a full central-directory
 * parse, because reading the whole archive to answer "is this an XPS" would
 * mean reading the whole upload.
 */
function detectZipFamily(buffer: Buffer): string | null {
  const window = buffer.subarray(0, Math.min(buffer.length, 128 * 1024));
  const text = window.toString('latin1');

  // OPC/XPS packages always contain these part names.
  if (text.includes('FixedDocumentSequence') || text.includes('mimetype')) {
    if (text.includes('application/oxps') || text.includes('FixedDocumentSequence')) return 'xps';
  }

  // CR3 embeds a `ftyp` box, which is what actually distinguishes it from a
  // generic ZIP. The `crx ` brand is Canon's own marker.
  if (text.includes('ftypcrx ') || text.includes('ftypcr3 ')) return 'cr3';
  if (buffer.subarray(0, 16).includes(Buffer.from('ftyp', 'latin1'))) return 'cr3';

  return null;
}

/**
 * TGA detection from the optional footer.
 *
 * TGA 1.0 has no header signature at all — the format is defined by the absence
 * of one — so the only evidence is the `TRUEVISION-XFILE` footer written by
 * TGA 2.0 writers. A 1.0 file is therefore undetectable, which is exactly the
 * "unknown" case the caller must tolerate rather than reject.
 */
function looksLikeTarga(buffer: Buffer): boolean {
  if (buffer.length < 26) return false;
  const footer = buffer.subarray(buffer.length - 18, buffer.length - 2);
  return footer.toString('latin1') === 'TRUEVISION-XFILE';
}

/** Canonicalise a detected format to the identifier the matrix uses. */
export function normaliseFormatId(format: string): string {
  const lower = format.toLowerCase().replace(/^\./, '');
  switch (lower) {
    case 'jpeg':
    case 'jfif':
      return 'jpg';
    case 'tif':
      return 'tiff';
    case 'heif':
      return 'heic';
    case 'jpe':
      return 'jpg';
    default:
      return lower;
  }
}

/**
 * Derive a format from a filename's extension.
 *
 * Used as the fallback when magic bytes are inconclusive, and as an independent
 * check: a file whose extension says PNG but whose bytes say JPEG is a mismatch
 * the route rejects. The extension is never used on its own to decide that a
 * file *is* that format.
 *
 * @returns the canonical identifier, or `null` when the extension is unknown or
 *   is not a legal source format.
 */
export function detectFormatFromFilename(filename: string): string | null {
  const base = filename.split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return null;

  const raw = base.slice(dot + 1);
  // Guard against a filename that is itself a long hex string or has no real
  // extension, and against absurdly long "extensions" that are really names.
  if (raw.length > 8) return null;

  const normalised = normaliseFormatId(raw);
  if (!isKnownSource(normalised)) {
    // Some formats are targets only (pdf). They are still recognisable names.
    return normalised.length > 0 ? normalised : null;
  }
  return normalised;
}

/** Result of validating a file's signature against its claimed extension. */
export interface SignatureCheck {
  /** Format the bytes actually look like, or `null`. */
  readonly detected: string | null;
  /** True when the file may proceed to conversion. */
  readonly ok: boolean;
  /** Set when the bytes contradict the extension. */
  readonly mismatch: boolean;
  /** The extension the caller claimed, canonicalised. */
  readonly claimed: string;
}

/**
 * Check a file's bytes against the format the caller declared.
 *
 * An unrecognised signature is *tolerated*, not rejected. TGA has no header,
 * several RAW variants are inconsistently tagged, and a truncated upload may be
 * too short to classify — in all of those cases there is no evidence of a
 * problem, and refusing the file would reject legitimate conversions.
 *
 * A file is only rejected when the bytes positively identify a *different*
 * format. That is the case worth catching: it means the declared type is a lie,
 * and routing the bytes to the wrong decoder is exactly what produces a
 * confusing downstream failure.
 */
export function verifySignature(bytes: Uint8Array, claimedExtension: string): SignatureCheck {
  const buffer = Buffer.isBuffer(bytes)
    ? bytes
    : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const claimed = normaliseFormatId(claimedExtension);
  const detected = detectFormatFromBuffer(buffer);

  if (detected === null) {
    return { detected: null, ok: true, mismatch: false, claimed };
  }

  // The same physical format is reachable under several matrix keys, so a
  // difference in name is not a difference in content.
  if (detected === claimed) {
    return { detected, ok: true, mismatch: false, claimed };
  }
  if (EQUIVALENT_FORMATS[detected]?.includes(claimed)) {
    return { detected, ok: true, mismatch: false, claimed };
  }

  return { detected, ok: false, mismatch: true, claimed };
}

/**
 * Format identifiers that denote the same bytes.
 *
 * The matrix keeps `jpg`/`jpeg`/`jfif` and `tiff`/`tif` as separate keys so the
 * picker can preserve a user's chosen spelling, which means a detector that
 * returned `jpg` would otherwise "mismatch" a file the user named `.jpeg`.
 */
const EQUIVALENT_FORMATS: Readonly<Record<string, readonly string[]>> = {
  jpg: ['jpeg', 'jfif'],
  tiff: ['tif'],
  heic: ['heif'],
  ps: ['eps'],
  psd: ['psb'],
};

/**
 * Identify a file from its leading bytes.
 *
 * Kept as the original `Uint8Array`-accepting entry point so existing callers
 * keep working; new code should use {@link detectFormatFromBuffer}, which takes
 * the `Buffer` the route already has and avoids a copy.
 */
export function detectFormatFromBytes(bytes: Uint8Array): string | null {
  const buffer = Buffer.isBuffer(bytes)
    ? bytes
    : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return detectFormatFromBuffer(buffer);
}

/** Read the first bytes of a `File` as a signature window. */
export async function readMagicBytes(file: File, length = 4096): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  return new Uint8Array(await slice.arrayBuffer());
}

/** True when the bytes satisfy the signature. */
function matchesAt(bytes: Buffer, signature: MagicSignature): boolean {
  const { offset, bytes: expected } = signature;
  if (expected.length === 0) return false;
  if (bytes.length < offset + expected.length) return false;

  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected[index]) return false;
  }
  return true;
}

/** Read `length` bytes at `offset` as a latin1 string, for tag comparison. */
function ascii(buffer: Buffer, offset: number, length: number): string {
  if (buffer.length < offset + length) return '';
  return buffer.subarray(offset, offset + length).toString('latin1');
}
