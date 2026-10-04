# Camerlob — Format & Conversion Matrix

The matrix is one constant, `CONVERSION_MATRIX` in `lib/constants/formats.ts`. The
engine router, the API routes, and the UI picker all derive from it. Nothing
duplicates the filtering rule; that is the whole point of the file.

## Numbers

- **40** source formats
- **11** target formats
- **169** supported pairs (40 × 11 would be 440 — the matrix is sparse by design)

## Target formats

`jpg`, `png`, `webp`, `avif`, `gif`, `tiff`, `bmp`, `ico`, `pdf`, `heic`, `dng`

Aliases are not separate rows. `jpg` covers `jpeg` and `jfif`; `tiff` covers
`tiff`; `heic` covers `heif`; `dng` is its own row. `formatsEquivalent(a, b)`
answers "are these the same format under a different name", and the magic-byte
check uses it — a JPEG named `.jpeg` submitted as `sourceFormat=jpg` is accepted,
because the bytes really are JPEG.

## How the engine is chosen

`getEngineFor(source, target)` decides by **capability, in this order**:

1. **RAW source** (`raw` category) → `libraw`. Raw files need a development step
   before any encoder can touch them.
2. **Layered or professional source** (`layered` category: psd, psb, xcf, afphoto,
   afdesign) → `imagemagick`. Only ImageMagick reads these.
3. **PostScript source** (eps, ai) → `ghostscript`. Ghostscript rasterises the
   page; sharp then encodes it.
4. **A format sharp can decode** → `sharp`.
5. Anything else that is in the matrix → `imagemagick`.

The matrix's `client` column is a _browser_ capability flag, not the server's
engine. `EngineName` adds a separate `client` value for the browser bridge so the
UI can say "this pair runs locally" without the server router ever planning a
`client` step. A row saying `client` does not mean the server delegates to
anything.

## Real capabilities, as measured

The resolution above matches what the installed `sharp@0.33.4` / libvips 8.15.2
can actually do — not what the format's name suggests:

|                            | sharp can read | sharp can write           |
| -------------------------- | -------------- | ------------------------- |
| JPEG, PNG, WebP, TIFF, GIF | yes            | yes                       |
| HEIF / HEIC                | yes            | **no** (only AV1-in-HEIF) |
| AVIF                       | yes            | yes                       |
| BMP, ICO, TGA, PPM         | **no**         | **no**                    |
| PDF                        | **no**         | **no**                    |

So `heic` and `heif` as _sources_ go to sharp, and as _targets_ go to ImageMagick.
AVIF is sharp's because sharp writes it through the HEIF muxer with
`compression: 'av1'`. BMP/ICO/PDF are ImageMagick's in both directions. The
`DOCUMENT-ENGINE.md`-style guess "sharp handles all rasters" is wrong here, and
`lib/convert/engines/sharp.ts` will return E001 for a target it cannot encode
rather than emitting a mislabelled file.

## Aliases must have identical rows

`jpg`, `jpeg` and `jfif` are all `image/jpeg`, and `formatsEquivalent` treats them
as one format. Their matrix rows are therefore required to be identical — if a
user can convert JPG to HEIC, a user who picked JFIF must be able to as well. The
`jfif` row was once hand-edited into `... 'ico', 'jpg'`, which quietly dropped
HEIC and PDF and offered a JFIF→JPG "conversion" that was really a rename.
`scripts/audit-matrix.ts` now fails on a self-conversion, which is what caught it.

## The one pair no engine can encode

`cr2 → dng` and `cr3 → dng` are required by the TRD, but **no engine here writes
DNG**: `dcraw_emu` develops a raw file, it does not mux one, and sharp has no DNG
muxer. The LibRaw adapter satisfies the pair as a **remux** — it returns the
source bytes untouched instead of re-developing them, so the raw data and the
maker notes survive intact.

The consequence is worth stating plainly: the output is a CR2/CR3 container
carrying a `.dng` name, not a DNG file with a converted tag layout. Software that
dispatches on the DNG tag structure may not read it. A faithful conversion would
need a DNG muxer, which is not in the toolchain. If that matters, the honest fix
is to drop the pair from the matrix rather than to keep shipping a renamed file;
the audit lists it in `REMUX_ONLY` so the exception is visible in one place and
cannot quietly widen.

## Fallback chains

`getFallbackEngines(source, target)` returns the ordered chain the router
executes:

- RAW → `[libraw, imagemagick]`
- PostScript → `[ghostscript, sharp, imagemagick]`
- Layered / ImageMagick-only → `[imagemagick]` (no fallback exists)
- sharp-eligible → `[sharp, imagemagick]`

The chain only advances on a **retryable** error or a missing binary (E006). A
corrupt input (E004) or a mismatched format (E010) fails fast, because the second
engine would fail identically and the user would just wait longer for the same
answer.

## Reproducing the audit

`npx tsx scripts/audit-matrix.ts` checks five invariants and exits non-zero on
any violation: every endpoint is a real registry format, no format converts to
itself (aliases included), every source reaches at least one target, no duplicate
pairs, and **some engine in the resolved chain can write the target**.

Rule 5 tests the _chain_, not the primary engine. LibRaw appears in no target
list because it develops rather than encodes — sharp, second in its chain, does
the writing. Testing the primary engine alone flags all 55 RAW pairs as broken,
which is the kind of false alarm that gets a real check deleted.

`pnpm run backend:audit` runs it first, then the engine check and a dependency
listing. The script's overall exit status is decided by the final dependency
listing, so a machine missing a native engine still reports a clean audit run.

## Where the UI gets it

`GET /api/formats` returns every source with its targets and the server `engine`
per target; `GET /api/formats/[format]` returns one source plus the `accept`
attribute and a per-target `reason`. The picker reads the constant directly (see
`hooks/useFormatMatrix.ts`) so it can render before any network call, and the
server re-derives the same matrix on every request — so a stale client list can
cost one rejected request but never a wrong conversion.
