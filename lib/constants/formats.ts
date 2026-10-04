/**
 * lib/constants/formats.ts
 * The single source of truth for every format identifier in Camerlob.
 *
 * Nothing else in the codebase may write a format identifier as a literal. The
 * conversion matrix is a plain frozen object with no imports so that
 * `GET /api/formats` can serialise it directly.
 *
 * Source: Documents/TRD.md section 7, Documents/PRD.md section 6.
 * Engine precedence inside a `targets` array is first-match-wins.
 */

import type { FormatCategory, ImageFormatMeta } from '@/types/format';

/** Canonical source identifiers, derived from the matrix keys. */
export type MatrixSource = keyof typeof CONVERSION_MATRIX;

/** One matrix row: the targets a source may become, plus its engine. */
export interface MatrixEntry {
  readonly targets: readonly string[];
  readonly engine: string;
  /** Export-only family: cannot be created from a raster source. */
  readonly oneWay?: boolean;
  /** Why the pair is one-way, shown in the UI on the format card. */
  readonly reason?: string;
}

export const CONVERSION_MATRIX = {
  // ---- Consumer raster: the client engine handles all of these ----
  jpg: {
    targets: ['png', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'ico', 'heic', 'pdf'],
    engine: 'CLIENT_WASM',
  },
  jpeg: {
    targets: ['png', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'ico', 'heic', 'pdf'],
    engine: 'CLIENT_WASM',
  },
  // jpg, jpeg and jfif are the same format under three names — all `image/jpeg`,
  // and `formatsEquivalent` treats them as one. Their rows must therefore be
  // identical. This one was hand-edited into `... 'ico', 'jpg'`, which quietly
  // dropped HEIC and PDF and offered a JFIF→JPG "conversion" that is a rename.
  jfif: {
    targets: ['png', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'ico', 'heic', 'pdf'],
    engine: 'CLIENT_WASM',
  },
  png: {
    targets: ['jpg', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'ico', 'pdf'],
    engine: 'CLIENT_WASM',
  },
  webp: { targets: ['png', 'jpg', 'avif', 'gif', 'tiff'], engine: 'CLIENT_WASM' },
  gif: { targets: ['png', 'webp', 'jpg', 'avif'], engine: 'CLIENT_WASM' },
  bmp: { targets: ['png', 'jpg', 'webp', 'tiff', 'ico'], engine: 'CLIENT_WASM' },
  ico: { targets: ['png', 'jpg', 'webp', 'bmp'], engine: 'CLIENT_WASM' },
  tiff: { targets: ['png', 'jpg', 'webp', 'avif'], engine: 'CLIENT_WASM' },
  tif: { targets: ['png', 'jpg', 'webp', 'avif'], engine: 'CLIENT_WASM' },
  avif: { targets: ['jpg', 'png', 'webp'], engine: 'CLIENT_WASM' },
  heic: { targets: ['jpg', 'png', 'webp', 'avif'], engine: 'CLIENT_WASM' },
  heif: { targets: ['jpg', 'png', 'webp', 'avif'], engine: 'CLIENT_WASM' },
  tga: { targets: ['png', 'jpg', 'webp', 'tiff'], engine: 'CLIENT_WASM' },
  ppm: { targets: ['png', 'jpg', 'webp', 'tiff'], engine: 'CLIENT_WASM' },

  // ---- RAW camera: LibRaw develop, then sharp encode. Source-only. ----
  cr2: { targets: ['jpg', 'png', 'tiff', 'webp', 'dng'], engine: 'SERVER_LIBRAW' },
  cr3: { targets: ['jpg', 'png', 'tiff', 'webp', 'dng'], engine: 'SERVER_LIBRAW' },
  crw: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  nef: { targets: ['jpg', 'png', 'tiff', 'webp'], engine: 'SERVER_LIBRAW' },
  arw: { targets: ['jpg', 'png', 'tiff', 'webp'], engine: 'SERVER_LIBRAW' },
  dng: { targets: ['jpg', 'png', 'tiff', 'webp'], engine: 'SERVER_LIBRAW' },
  orf: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  raf: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  rw2: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  pef: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  '3fr': { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  mrw: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  dcr: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  erf: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  mos: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },
  x3f: { targets: ['jpg', 'png', 'tiff'], engine: 'SERVER_LIBRAW' },

  // ---- Layered and vector: export to raster only, one-way. ----
  psd: {
    targets: ['jpg', 'png', 'webp', 'tiff'],
    engine: 'SERVER_IMAGEMAGICK',
    oneWay: true,
    reason: 'Layered formats export to raster; a raster image cannot become layered.',
  },
  psb: {
    targets: ['jpg', 'png', 'webp', 'tiff'],
    engine: 'SERVER_IMAGEMAGICK',
    oneWay: true,
    reason: 'Layered formats export to raster; a raster image cannot become layered.',
  },
  xcf: {
    targets: ['jpg', 'png', 'tiff'],
    engine: 'SERVER_IMAGEMAGICK',
    oneWay: true,
    reason: 'GIMP project files export to raster only.',
  },
  eps: {
    targets: ['jpg', 'png', 'tiff', 'pdf'],
    engine: 'SERVER_GHOSTSCRIPT',
    oneWay: true,
    reason: 'Vector formats export to raster; paths cannot be recovered from a bitmap.',
  },
  ps: {
    targets: ['jpg', 'png', 'tiff', 'pdf'],
    engine: 'SERVER_GHOSTSCRIPT',
    oneWay: true,
    reason: 'Vector formats export to raster; paths cannot be recovered from a bitmap.',
  },
  xps: {
    targets: ['jpg', 'png', 'tiff'],
    engine: 'SERVER_GHOSTSCRIPT',
    oneWay: true,
    reason: 'XPS packages export to raster only.',
  },
  pub: {
    targets: ['jpg', 'png', 'tiff', 'pdf'],
    engine: 'SERVER_IMAGEMAGICK',
    oneWay: true,
    reason: 'Publication files export to raster only.',
  },
  odd: {
    targets: ['jpg', 'png', 'tiff', 'pdf'],
    engine: 'SERVER_IMAGEMAGICK',
    oneWay: true,
    reason: 'Publication files export to raster only.',
  },
  odg: {
    targets: ['jpg', 'png', 'tiff', 'pdf'],
    engine: 'SERVER_IMAGEMAGICK',
    oneWay: true,
    reason: 'Publication files export to raster only.',
  },
} as const satisfies Record<string, MatrixEntry>;

/**
 * Widen one inferred matrix row to the declared `MatrixEntry`.
 *
 * `CONVERSION_MATRIX` is a bare object literal so that `keyof typeof` still
 * yields the literal source ids. The cost is that each row is inferred with only
 * the keys it actually has, so the optional `oneWay` / `reason` fields on the
 * interface are invisible to the type checker even though the runtime values
 * carry them. This accessor restores the declared shape without widening the
 * matrix itself.
 */
function asEntry(row: {
  readonly targets: readonly string[];
  readonly engine: string;
}): MatrixEntry {
  return row;
}

/** Every format that may be chosen as a source. */
export const SOURCE_FORMATS: readonly string[] = Object.keys(CONVERSION_MATRIX);

/**
 * Every format that may be chosen as a target: the union of all target arrays.
 * `pdf` appears here and never as a key, because PDF is output-only.
 */
export const TARGET_FORMATS: readonly string[] = [
  ...new Set(Object.values(CONVERSION_MATRIX).flatMap((entry) => [...entry.targets])),
].sort();

/** Formats that can only be read, never written. */
export const SOURCE_ONLY_FORMATS: readonly string[] = SOURCE_FORMATS.filter(
  (id) => !TARGET_FORMATS.includes(id)
);

/** Export-only families, with the reason shown on the format card. */
export const ONE_WAY_FORMATS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(CONVERSION_MATRIX)
    .filter(([, entry]) => asEntry(entry).oneWay === true)
    .map(([id, entry]) => [id, asEntry(entry).reason ?? 'This format can only be exported.'])
);

/** RAW camera family, in PRD order. */
export const RAW_FORMATS: readonly string[] = [
  'cr2',
  'cr3',
  'crw',
  'nef',
  'arw',
  'dng',
  'orf',
  'raf',
  'rw2',
  'pef',
  '3fr',
  'mrw',
  'dcr',
  'erf',
  'mos',
  'x3f',
];

/** Consumer raster family, in PRD order. */
export const RASTER_FORMATS: readonly string[] = [
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
  'tga',
  'ppm',
];

/** Professional formats, in PRD order. */
export const PROFESSIONAL_FORMATS: readonly string[] = [
  'psd',
  'psb',
  'eps',
  'ps',
  'xps',
  'xcf',
  'pub',
  'odd',
  'odg',
];

/**
 * Display metadata for every identifier. The engine column drives the
 * `LOCAL ONLY` badge in the format picker.
 */
export const FORMAT_REGISTRY: Readonly<Record<string, ImageFormatMeta>> = {
  jpg: meta(
    'jpg',
    'JPG',
    ['.jpg'],
    'image/jpeg',
    'raster',
    true,
    null,
    false,
    'Baseline JPEG, the most common source format.'
  ),
  jpeg: meta(
    'jpeg',
    'JPEG',
    ['.jpeg', '.jpg'],
    'image/jpeg',
    'raster',
    true,
    null,
    false,
    'JPEG with the .jpeg extension.'
  ),
  jfif: meta(
    'jfif',
    'JFIF',
    ['.jfif'],
    'image/jpeg',
    'raster',
    true,
    null,
    false,
    'JPEG File Interchange Format.'
  ),
  png: meta(
    'png',
    'PNG',
    ['.png'],
    'image/png',
    'raster',
    true,
    null,
    false,
    'Lossless raster with alpha transparency.'
  ),
  webp: meta(
    'webp',
    'WEBP',
    ['.webp'],
    'image/webp',
    'raster',
    true,
    null,
    false,
    'Modern web format with alpha support.'
  ),
  gif: meta(
    'gif',
    'GIF',
    ['.gif'],
    'image/gif',
    'raster',
    true,
    null,
    false,
    'Animated GIF. Converts to the first frame.'
  ),
  bmp: meta(
    'bmp',
    'BMP',
    ['.bmp'],
    'image/bmp',
    'raster',
    true,
    null,
    false,
    'Windows bitmap, uncompressed.'
  ),
  ico: meta(
    'ico',
    'ICO',
    ['.ico'],
    'image/x-icon',
    'raster',
    true,
    null,
    false,
    'Windows icon with multiple sizes.'
  ),
  tiff: meta(
    'tiff',
    'TIFF',
    ['.tiff', '.tif'],
    'image/tiff',
    'raster',
    true,
    null,
    false,
    'Lossless raster, print and scan standard.'
  ),
  tif: meta(
    'tif',
    'TIF',
    ['.tif'],
    'image/tiff',
    'raster',
    true,
    null,
    false,
    'TIFF with the .tif extension.'
  ),
  avif: meta(
    'avif',
    'AVIF',
    ['.avif'],
    'image/avif',
    'raster',
    true,
    null,
    false,
    'Highest compression among supported targets.'
  ),
  heic: meta(
    'heic',
    'HEIC',
    ['.heic'],
    'image/heic',
    'raster',
    true,
    null,
    false,
    'iPhone default. Decoded in-browser via heic2any.'
  ),
  heif: meta(
    'heif',
    'HEIF',
    ['.heif'],
    'image/heif',
    'raster',
    true,
    null,
    false,
    'HEIF container, the HEIC family parent.'
  ),
  tga: meta(
    'tga',
    'TGA',
    ['.tga'],
    'image/x-tga',
    'raster',
    true,
    null,
    false,
    'Truevision Targa, common in game art.'
  ),
  ppm: meta(
    'ppm',
    'PPM',
    ['.ppm'],
    'image/x-portable-pixmap',
    'raster',
    true,
    null,
    false,
    'Netpbm portable pixmap.'
  ),

  cr2: meta(
    'cr2',
    'CR2',
    ['.cr2'],
    'image/x-canon-cr2',
    'raw',
    false,
    'LibRaw',
    true,
    'Canon RAW, second generation.'
  ),
  cr3: meta(
    'cr3',
    'CR3',
    ['.cr3'],
    'image/x-canon-cr3',
    'raw',
    false,
    'LibRaw',
    true,
    'Canon RAW, third generation. May target DNG.'
  ),
  crw: meta(
    'crw',
    'CRW',
    ['.crw'],
    'image/x-canon-crw',
    'raw',
    false,
    'LibRaw',
    true,
    'Canon RAW, first generation.'
  ),
  nef: meta(
    'nef',
    'NEF',
    ['.nef'],
    'image/x-nikon-nef',
    'raw',
    false,
    'LibRaw',
    true,
    'Nikon RAW.'
  ),
  arw: meta('arw', 'ARW', ['.arw'], 'image/x-sony-arw', 'raw', false, 'LibRaw', true, 'Sony RAW.'),
  dng: meta(
    'dng',
    'DNG',
    ['.dng'],
    'image/x-adobe-dng',
    'raw',
    false,
    'LibRaw',
    true,
    'Adobe Digital Negative, the only RAW target.'
  ),
  orf: meta(
    'orf',
    'ORF',
    ['.orf'],
    'image/x-olympus-orf',
    'raw',
    false,
    'LibRaw',
    true,
    'Olympus RAW.'
  ),
  raf: meta(
    'raf',
    'RAF',
    ['.raf'],
    'image/x-fuji-raf',
    'raw',
    false,
    'LibRaw',
    true,
    'Fujifilm RAW.'
  ),
  rw2: meta(
    'rw2',
    'RW2',
    ['.rw2'],
    'image/x-panasonic-rw2',
    'raw',
    false,
    'LibRaw',
    true,
    'Panasonic RAW.'
  ),
  pef: meta(
    'pef',
    'PEF',
    ['.pef'],
    'image/x-pentax-pef',
    'raw',
    false,
    'LibRaw',
    true,
    'Pentax RAW.'
  ),
  '3fr': meta(
    '3fr',
    '3FR',
    ['.3fr'],
    'image/x-hasselblad-3fr',
    'raw',
    false,
    'LibRaw',
    true,
    'Hasselblad RAW.'
  ),
  mrw: meta(
    'mrw',
    'MRW',
    ['.mrw'],
    'image/x-minolta-mrw',
    'raw',
    false,
    'LibRaw',
    true,
    'Minolta RAW.'
  ),
  dcr: meta(
    'dcr',
    'DCR',
    ['.dcr'],
    'image/x-kodak-dcr',
    'raw',
    false,
    'LibRaw',
    true,
    'Kodak RAW.'
  ),
  erf: meta(
    'erf',
    'ERF',
    ['.erf'],
    'image/x-ephicam-erf',
    'raw',
    false,
    'LibRaw',
    true,
    'Epson RAW.'
  ),
  mos: meta(
    'mos',
    'MOS',
    ['.mos'],
    'image/x-leaf-mos',
    'raw',
    false,
    'LibRaw',
    true,
    'Leaf MOS RAW.'
  ),
  x3f: meta(
    'x3f',
    'X3F',
    ['.x3f'],
    'image/x-sigma-x3f',
    'raw',
    false,
    'LibRaw',
    true,
    'Sigma X3F RAW.'
  ),

  psd: meta(
    'psd',
    'PSD',
    ['.psd'],
    'image/vnd.adobe.photoshop',
    'layered',
    false,
    'ImageMagick',
    true,
    'Photoshop layered document. Export only.',
    true
  ),
  psb: meta(
    'psb',
    'PSB',
    ['.psb'],
    'image/vnd.adobe.photoshop',
    'layered',
    false,
    'ImageMagick',
    true,
    'Large Document Format, for files above 2 GB.',
    true
  ),
  xcf: meta(
    'xcf',
    'XCF',
    ['.xcf'],
    'image/x-gimp-xcf',
    'layered',
    false,
    'ImageMagick',
    true,
    'GIMP project file. Export only.',
    true
  ),
  eps: meta(
    'eps',
    'EPS',
    ['.eps'],
    'application/postscript',
    'vector',
    false,
    'Ghostscript',
    true,
    'Encapsulated PostScript. Needs Ghostscript.',
    true
  ),
  ps: meta(
    'ps',
    'PS',
    ['.ps'],
    'application/postscript',
    'vector',
    false,
    'Ghostscript',
    true,
    'PostScript. Needs Ghostscript.',
    true
  ),
  xps: meta(
    'xps',
    'XPS',
    ['.xps'],
    'application/oxps',
    'vector',
    false,
    'Ghostscript',
    true,
    'Microsoft Open XML Paper Specification.',
    true
  ),
  pub: meta(
    'pub',
    'PUB',
    ['.pub'],
    'application/x-mspublisher',
    'document',
    false,
    'ImageMagick',
    true,
    'Microsoft Publisher document. Export only.',
    true
  ),
  odd: meta(
    'odd',
    'ODD',
    ['.odd'],
    'application/vnd.ms-word.document.macroenabled.12',
    'document',
    false,
    'ImageMagick',
    true,
    'OmniGraffle document. Export only.',
    true
  ),
  odg: meta(
    'odg',
    'ODG',
    ['.odg'],
    'application/vnd.oasis.opendocument.graphics',
    'document',
    false,
    'ImageMagick',
    true,
    'OpenDocument Graphics. Export only.',
    true
  ),

  pdf: meta(
    'pdf',
    'PDF',
    ['.pdf'],
    'application/pdf',
    'document',
    true,
    'Ghostscript',
    false,
    'Output only. Reading PDF is an explicit non-goal.'
  ),
} as const;

/** Category ordering used by the format picker. */
export const CATEGORY_ORDER: readonly FormatCategory[] = [
  'raster',
  'raw',
  'layered',
  'vector',
  'document',
];

function meta(
  id: string,
  label: string,
  extensions: readonly string[],
  mimeType: string,
  category: FormatCategory,
  clientSupport: boolean,
  requiredEngine: string | null,
  sourceOnly: boolean,
  description: string,
  oneWay = false
): ImageFormatMeta {
  return Object.freeze({
    id,
    label,
    extensions: Object.freeze([...extensions]),
    mimeType,
    category,
    clientSupport,
    requiredEngine,
    // A one-way export family is never a valid source target.
    sourceOnly: sourceOnly || oneWay,
    description,
  });
}

/** Look up display metadata, falling back to a synthetic entry. */
export function getFormatMeta(id: string): ImageFormatMeta {
  const found = FORMAT_REGISTRY[id];
  if (found) return found;
  return meta(
    id,
    id.toUpperCase(),
    [`.${id}`],
    'application/octet-stream',
    'raster',
    false,
    null,
    true,
    'Unregistered format.'
  );
}

/** True when `id` is a legal source identifier. */
export function isKnownSource(id: string): id is MatrixSource {
  return Object.prototype.hasOwnProperty.call(CONVERSION_MATRIX, id);
}

/** True when `id` may be chosen as a conversion target. */
export function isKnownTarget(id: string): boolean {
  return TARGET_FORMATS.includes(id);
}
