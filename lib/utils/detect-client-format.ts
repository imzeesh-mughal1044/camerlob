/**
 * lib/utils/detect-client-format.ts
 * Browser-safe format detection for the upload zone.
 *
 * WHY THIS IS NOT `lib/utils/magic-bytes.ts`
 * ------------------------------------------------------------------------
 * The server detector takes a Node `Buffer`, scans 64KB and reads a whole file
 * for a ZIP central directory. A browser `File` can be sliced but not aliased
 * into a `Buffer` without a polyfill, and the whole point of the upload zone is
 * to decide *before* uploading whether a file belongs in the batch. So the
 * signature table is restated here against `Uint8Array` and `File.slice`, and
 * the two are kept in step by the shared table below rather than by importing
 * each other — importing the server module would drag `Buffer` into the client
 * bundle.
 *
 * WHAT 512 BYTES IS FOR
 * ------------------------------------------------------------------------
 * The naive reading of a magic-byte check is "read the first 64 bytes", which is
 * enough for JPEG and PNG and useless for camera RAW. NEF, ARW, DNG, PEF, ORF,
 * RW2 and 3FR are all TIFF containers: their first four bytes are a byte-order
 * mark, and the vendor only appears in the IFD, typically between byte 8 and
 * byte 512. Reading 64 bytes would classify a Nikon NEF as a plain TIFF and
 * offer the user a TIFF conversion that the server then rejects as E010.
 *
 * 512 bytes is the compromise: enough headroom for the Make and Model tags
 * every vendor writes near the front of the IFD, and small enough that reading
 * it is free next to opening the file at all. Anything still inconclusive after
 * 512 bytes falls back to the extension, which is a *hint*, never a verdict —
 * see {@link detectFormatFromFile}.
 *
 * WHY A SHALLOW READ IS ENOUGH FOR THE BROWSER
 * ------------------------------------------------------------------------
 * The server re-detects every upload from its own bytes and rejects any
 * disagreement as E010, so this pass is a user-experience filter, not a
 * security control. It exists so a PNG renamed `.cr2` is caught in the drop zone
 * with a sentence the user can act on, instead of after a 40MB upload.
 */

import { isKnownSource } from '@/lib/constants/formats';

/**
 * Canonicalise an extension or signature name to a matrix key.
 *
 * Mirrors `normaliseFormatId` in `lib/utils/magic-bytes.ts` rather than
 * importing it, for the reason at the top of this file: that module's other
 * exports take a Node `Buffer`, and a client bundle must not reference one. The
 * two lists are four aliases long; if one grows, this is the second place to
 * change and the comment says so.
 */
function normaliseFormatId(format: string): string {
  const lower = format.toLowerCase().replace(/^\./, '');
  switch (lower) {
    case 'jpeg':
    case 'jfif':
    case 'jpe':
      return 'jpg';
    case 'tif':
      return 'tiff';
    case 'heif':
      return 'heic';
    default:
      return lower;
  }
}

/**
 * Bytes read from the head of a file for signature matching.
 *
 * 512 rather than 64 for the TIFF-family reason documented at the top of this
 * file. The TIFF vendor check needs it; nothing else is harmed by it.
 */
export const CLIENT_SIGNATURE_BYTES = 512;

/** A byte signature: offset from the start of the file, and the bytes there. */
interface Signature {
  readonly format: string;
  readonly offset: number;
  readonly bytes: readonly number[];
}

/**
 * Fixed-offset signatures, in priority order.
 *
 * Deliberately omits RIFF and both TIFF byte-order marks: those are containers
 * shared by a whole family and are resolved by the deeper passes before this
 * table is consulted. The generic TIFF entry is absent entirely for the same
 * reason — leaving it out is what guarantees a generic TIFF answer can only come
 * from {@link detectTiffFamily}, after every vendor has been ruled out.
 */
const SIGNATURES: readonly Signature[] = [
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

  // ---- PostScript: the DSC comment must follow %! ----
  {
    format: 'eps',
    offset: 0,
    bytes: [0x25, 0x21, 0x50, 0x53, 0x2d, 0x41, 0x64, 0x6f, 0x62, 0x65],
  }, // %!PS-Adobe

  // ---- RAW with a vendor header of its own ----
  { format: 'raf', offset: 0, bytes: [0x46, 0x55, 0x4a, 0x49, 0x46, 0x49, 0x4c, 0x4d] }, // FUJIFILM
  { format: 'x3f', offset: 0, bytes: [0x46, 0x4f, 0x56, 0x62] }, // FOVb
  { format: 'orf', offset: 0, bytes: [0x49, 0x49, 0x52, 0x4f] }, // IIRO
  { format: 'orf', offset: 0, bytes: [0x4d, 0x4d, 0x4f, 0x52] }, // MMOR
  { format: 'rw2', offset: 0, bytes: [0x49, 0x49, 0x55, 0x00] }, // IIU\0

  // ---- ZIP container: XPS lives here, and so does Canon CR3 ----
  { format: 'zip', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
];

/**
 * ISO-BMFF brands, read at offset 8 — the four bytes after `ftyp`.
 *
 * AVIF, HEIC and HEIF are all `....ftyp`, so offset 4 alone cannot separate them,
 * and a plain MP4 is one too. A detector that stops at `ftyp` calls every video
 * an AVIF.
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
  // Canon's own marker. CR3 is a QuickTime-style box, not a TIFF, so without
  // this the file would fall through to the extension fallback at best.
  'crx ': 'cr3',
  cr3: 'cr3',
};

/**
 * Vendor makes found in a TIFF IFD, mapped to the RAW format they produce.
 *
 * Ordered by how often the make appears in a CameraTagsMakerNote, so the common
 * vendors win a tie on a camera that writes two makes into one file.
 */
const TIFF_VENDOR_MAKES: ReadonlyArray<readonly [string, string]> = [
  ['NIKON', 'nef'],
  ['SONY', 'arw'],
  ['CANON', 'cr2'],
  ['PENTAX', 'pef'],
  ['RICOH', 'pef'],
  ['OLYMPUS', 'orf'],
  ['OM DIGITAL', 'orf'],
  ['PANASONIC', 'rw2'],
  ['LEICA', 'rw2'],
  ['HASSELBLAD', '3fr'],
  ['MINOLTA', 'mrw'],
  ['KODAK', 'dcr'],
  ['EPSON', 'erf'],
  ['LEAF', 'mos'],
  ['SIGMA', 'x3f'],
  ['FUJIFILM', 'raf'],
];

/**
 * Tags that positively identify a DNG.
 *
 * DNG needs a list rather than a single make because Adobe wrote it to be
 * vendor-neutral: a DNG can come from a Leica, a Ricoh or a phone, and may
 * carry no make at all. Checked *before* the vendor table, since a DNG written
 * by a Nikon carries NIKON and would otherwise be called a NEF.
 */
const DNG_TAGS: readonly string[] = ['DNGVERSION', 'UNIQUE CAMERA MODEL', 'DNGBACKWARDVERSION'];

/** Read `length` bytes at `offset` as a latin1 string, for tag comparison. */
function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return '';
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += String.fromCharCode(bytes[offset + index] as number);
  }
  return out;
}

/** True when the bytes at `signature.offset` match `signature.bytes`. */
function matchesAt(bytes: Uint8Array, signature: Signature): boolean {
  const { offset, bytes: expected } = signature;
  if (expected.length === 0) return false;
  if (bytes.length < offset + expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected[index]) return false;
  }
  return true;
}

/**
 * Resolve a TIFF container to a specific RAW variant, or to plain `tiff`.
 *
 * A full IFD walk would be correct and slow; a bounded scan of the first 512
 * bytes is a heuristic with a fixed cost, and camera vendors do put Make near
 * the front. An unmapped vendor still returns `tiff`: the file *is* a valid
 * TIFF, and routing it to sharp is the right answer even if this app has no
 * dedicated card for that body.
 */
function detectTiffFamily(head: Uint8Array): string {
  const haystack = ascii(head, 0, head.length).toUpperCase();

  if (DNG_TAGS.some((tag) => haystack.includes(tag))) return 'dng';

  for (const [vendor, format] of TIFF_VENDOR_MAKES) {
    if (haystack.includes(vendor)) return format;
  }

  return 'tiff';
}

/**
 * Resolve a ZIP-container format from the window.
 *
 * Only the head is inspected, because the browser pass deliberately does not
 * read to the central directory. `FixedDocumentSequence` appears in the first
 * part of an XPS package, and a CR3 announces itself with an `ftypcrx ` box
 * inside its first few kilobytes, so both are reachable in a shallow read.
 */
function detectZipFamily(head: Uint8Array, text: string): string {
  if (text.includes('FixedDocumentSequence')) return 'xps';
  if (text.includes('ftypcrx ') || text.includes('ftypcr3 ')) return 'cr3';
  // `crx ` as an ISO-BMFF brand, for a CR3 written without the literal ftyp tag.
  if (ascii(head, 4, 4) === 'ftyp' && ascii(head, 8, 4) === 'crx ') return 'cr3';
  // An OPC package always names its own mimetype part.
  if (text.includes('application/oxps')) return 'xps';
  return 'zip';
}

/**
 * Identify a file from a signature window.
 *
 * The ordering is load-bearing. RIFF and the two TIFF byte-order marks are
 * containers shared by a whole family, so both are resolved before the
 * fixed-offset table runs; otherwise a WEBP would be reported as an unknown
 * RIFF and a NEF as a plain TIFF.
 *
 * @param head The first {@link CLIENT_SIGNATURE_BYTES} of the file.
 * @param tail The last 26 bytes, or an empty array when the file is too short.
 * @returns the canonical format identifier, or `null` when nothing matches.
 */
export function detectFormatFromWindow(head: Uint8Array, tail: Uint8Array): string | null {
  if (head.length < 4) return null;

  // RIFF: the fourcc at offset 8 is what says WEBP. Another RIFF flavour is
  // not a format this app converts, so it is not a format at all.
  if (matchesAt(head, { format: 'webp', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] })) {
    return ascii(head, 8, 4) === 'WEBP' ? 'webp' : null;
  }

  // The TIFF family next, because its own signature is only a byte-order mark
  // and would otherwise shadow every RAW variant sharing the container.
  if (
    matchesAt(head, { format: 'tiff', offset: 0, bytes: [0x49, 0x49, 0x2a, 0x00] }) ||
    matchesAt(head, { format: 'tiff', offset: 0, bytes: [0x4d, 0x4d, 0x00, 0x2a] })
  ) {
    return detectTiffFamily(head);
  }

  // `ftyp` is only meaningful together with the brand that follows it, so it is
  // checked here rather than sitting in the signature table.
  if (ascii(head, 4, 4) === 'ftyp') {
    return ISO_BMFF_BRANDS[ascii(head, 8, 4).toLowerCase()] ?? null;
  }

  for (const signature of SIGNATURES) {
    if (!matchesAt(head, signature)) continue;
    if (signature.format !== 'zip') return signature.format;
    return detectZipFamily(head, ascii(head, 0, head.length));
  }

  // TGA is defined by the absence of a header. Its only signature is the
  // `TRUEVISION-XFILE` footer written by TGA 2.0, at a fixed offset from EOF —
  // which is why this reads the tail as well as the head.
  if (tail.length >= 26 && ascii(tail, tail.length - 18, 16) === 'TRUEVISION-XFILE') {
    return 'tga';
  }

  return null;
}

/**
 * Detect a file's real format in the browser.
 *
 * Magic bytes decide. The extension is consulted only when the bytes are
 * inconclusive, and the result says which of the two produced it — a caller that
 * needs to be strict (the manual-mode upload path) can require
 * `method === 'magic'`, while a caller that merely needs a sensible default can
 * accept the extension answer.
 *
 * @param file The file to inspect. Never read beyond 512 bytes at the head and
 *   26 at the tail, so this is cheap for a 50MB RAW.
 * @returns the detected format and how it was determined, or `null` when the
 *   file is neither recognisable by signature nor by a legal extension.
 */
export async function detectFormatFromFile(
  file: File
): Promise<{ format: string | null; method: 'magic' | 'extension' | 'none' }> {
  let head: Uint8Array;
  let tail: Uint8Array;

  try {
    const [headBuffer, tailBuffer] = await Promise.all([
      file.slice(0, CLIENT_SIGNATURE_BYTES).arrayBuffer(),
      // A short file cannot have a footer 18 bytes from its own end.
      file.size > 26
        ? file.slice(file.size - 26, file.size).arrayBuffer()
        : Promise.resolve(new ArrayBuffer(0)),
    ]);
    head = new Uint8Array(headBuffer);
    tail = new Uint8Array(tailBuffer);
  } catch {
    // A File that cannot be read — a removed drive, a revoked handle — is
    // reported as unknown rather than throwing into a drop handler.
    return { format: null, method: 'none' };
  }

  const detected = detectFormatFromWindow(head, tail);
  if (detected !== null) return { format: detected, method: 'magic' };

  const byExtension = normaliseFormatId(extensionOf(file.name));
  if (byExtension && isKnownSource(byExtension)) {
    return { format: byExtension, method: 'extension' };
  }

  return { format: null, method: 'none' };
}

/** The lowercase extension of a filename, without the dot. */
function extensionOf(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  const raw = base.slice(dot + 1);
  // A "filename" that is really a long hex string has no real extension.
  return raw.length > 8 ? '' : raw;
}
