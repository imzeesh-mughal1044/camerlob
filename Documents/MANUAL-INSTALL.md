# Manual Install — Native Conversion Engines

Camerlob runs without any native binaries, but a subset of the format matrix is
unreachable until the engines below are installed. This file is the runbook for
installing them by hand.

> The npm dependencies in `package.json` are installed. The native engine
> commands in this file are documented per-platform but have not been
> executed on every platform in this repository's CI. Verify the relevant
> section on your machine before relying on it.

---

## 1. Current status of this machine

Captured from `pnpm check-engines` at the time of writing.

```
Camerlob — native engine check
platform: linux (debian)
node:     v22.22.1

  MISSING  ImageMagick   not found on PATH
             tried: /usr/bin/magick, magick, convert
             IMAGEMAGICK_PATH=/usr/bin/magick is set but not answering
             install: sudo apt install imagemagick
  MISSING  LibRaw        not found on PATH
             tried: /usr/bin/dcraw_emu, dcraw_emu, rawtherapee-cli
             LIBRAW_PATH=/usr/bin/dcraw_emu is set but not answering
             install: sudo apt install libraw-bin
  MISSING  Ghostscript   not found on PATH
             tried: /usr/bin/gs, gs, gswin64c, gswin32c
             GHOSTSCRIPT_PATH=/usr/bin/gs is set but not answering
             install: sudo apt install ghostscript
  MISSING  ExifTool      not found on PATH
             tried: exiftool
             install: sudo apt install libimage-exiftool-perl

Critical engines missing: ImageMagick, LibRaw
These gate whole format families.
Optional engines missing: Ghostscript, ExifTool
Camerlob still runs; the matching formats are reported as unavailable.
```

`pnpm check-engines` exits `1` here, by design: the two critical engines gate
whole format families, so a non-zero exit is the correct signal for CI. Note
that `node v22.22.1` is also above the `20.11.1` the TRD pins — see §6.

### Reading the `is set but not answering` lines

`.env.local` pins absolute Linux paths (`/usr/bin/magick` and friends). Those
files do not exist on this machine, because the packages were never installed.

This is deliberately **not** treated as a hard stop. The detector falls back to
a plain `PATH` lookup and reports the dead override separately, because a stale
absolute path is a very common state on a machine where the tool was upgraded or
moved — and a tool that is working on `PATH` should not be reported as missing
just because an env var is stale.

### What still works right now

Everything the browser can do. Canvas, `heic2any` and `browser-image-compression`
need no system packages, so JPG, PNG, WEBP, GIF, BMP, ICO, TIFF, TGA, AVIF, HEIC
and HEIF are all available with no install at all. The formats that need a
server engine — the 16 camera RAW containers, the layered formats (PSD, PSB,
XCF) and the vector/publication formats (EPS, PS, XPS) — are correctly reported
as unavailable by `GET /api/health` instead of failing mid-conversion.

---

## 2. What each engine is for

| Engine | Critical | Formats it unlocks | Without it |
|---|---|---|---|
| ImageMagick 7 | Yes | PSD, PSB, XCF, PUB, ODD, ODG, plus a RAW fallback path | Layered and publication formats are refused up front |
| LibRaw (`dcraw_emu`) | Yes | All 16 RAW: CR2, CR3, CRW, NEF, ARW, DNG, ORF, RAF, RW2, PEF, 3FR, MRW, DCR, ERF, MOS, X3F | No camera RAW support at all |
| Ghostscript | No | EPS, PS, XPS | Three formats unavailable; nothing else affected |
| ExifTool | No | Metadata read/write in `original` mode | Metadata passes through untouched |

LibRaw and Ghostscript are not encoders. Both *develop* or *rasterise* their
input into a raster, which sharp then writes in the target format. That is why
installing them without sharp gets you nowhere, and why `sharp` is a hard
dependency.

---

## 3. Install on this machine (Debian/Ubuntu)

```bash
# Critical engines
sudo apt-get update
sudo apt-get install -y imagemagick libraw-bin

# Optional engines
sudo apt-get install -y ghostscript libimage-exiftool-perl
```

Notes on this platform:

- **ImageMagick.** Debian stable still ships ImageMagick 6 (`convert` but no
  `magick`). If `magick -version` is missing after install, promote IM7:
  ```bash
  sudo update-alternatives --install /usr/bin/magick imagemagick-7 \
    /usr/bin/magick-im7.q16 1
  ```
  The detector probes `magick` first and falls back to `convert`, so IM6 is
  detected either way — but the TRD targets IM7 and that is the tested path.
- **LibRaw.** The package providing `dcraw_emu` is named `libraw-bin` on
  current Debian/Ubuntu and `libraw-tools` on some older releases. If
  `libraw-bin` is not found, try `libraw-tools`. `libraw-dev` is headers only
  and will not install the binary.
- **Permissions.** None of these need a version pin in this repo; the TRD's
  targets (ImageMagick 7.1.1, LibRaw 0.21.4, Ghostscript 10.02.1) are what CI
  pins, and distribution packages are close enough for local development.

After installing, re-verify:

```bash
pnpm check-engines
```

## 4. Install on other platforms

### macOS (Homebrew)

```bash
brew install imagemagick libraw ghostscript exiftool
export IMAGEMAGICK_PATH="$(brew --prefix)/bin/magick"
export LIBRAW_PATH="$(brew --prefix)/bin/dcraw_emu"
export GHOSTSCRIPT_PATH="$(brew --prefix)/bin/gs"
```

Apple Silicon prefixes to `/opt/homebrew`, Intel to `/usr/local`, which is why
`brew --prefix` is used rather than a hardcoded path.

### Arch (pacman)

```bash
sudo pacman -S nodejs-lts pnpm imagemagick libraw ghostscript perl-image-exiftool
```

### Windows (winget)

```powershell
winget install ImageMagick.ImageMagick
winget install ArtifexSoftware.GhostScript
winget install OliverBetz.ImageExifTool
```

LibRaw has no winget package. Either build `dcraw_emu` from source with vcpkg, or
lean on the ImageMagick delegate path documented in TRD §18. The detector
already accounts for the Windows binary names `magick.exe`, `dcraw_emu.exe` and
`gswin64c.exe`.

### Windows (Chocolatey, alternative)

```powershell
choco install imagemagick ghostscript exiftool --yes
```

---

## 5. Configure the engine paths

The three `*_PATH` variables are optional. When unset, the engines are resolved
from `PATH`, which is what most single-machine setups want. Set them when a
binary lives somewhere unusual, or when several versions are installed and the
choice must be explicit.

They belong in `.env.local`, which is git-ignored. `.env.example` documents the
defaults and is safe to commit.

```bash
# .env.local
IMAGEMAGICK_PATH=/usr/bin/magick
LIBRAW_PATH=/usr/bin/dcraw_emu
GHOSTSCRIPT_PATH=/usr/bin/gs
```

`pnpm check-engines` reads `.env.local` itself, using the same precedence Next.js
uses: a real environment variable outranks the file, and `.env.local` outranks
`.env`. That is deliberate — a detector that ignored the app's configuration
would happily report a green build for a machine where the app itself is
pointed at a broken binary.

## 6. Node.js version

The TRD pins `20.11.1` LTS and `.nvmrc` requests major version 20. This machine
is running `v22.22.1`, which is above that pin. Nothing observed so far
misbehaves because of it — `pnpm install`, `pnpm typecheck` and
`pnpm check-engines` all pass on 22 — but if a native build issue turns up later,
switching with `nvm use 20` is the first thing to try:

```bash
nvm install 20 && nvm use 20
```

`lib/convert/server-converter.ts` deliberately avoids `process.loadEnvFile`, which
only exists from Node 20.12, so the detector keeps working on 20.11.

## 7. Deployment note

The Vercel target is a deliberately reduced surface, not a deployment that can
satisfy the full format matrix. Serverless runtimes do not expose ImageMagick,
LibRaw or Ghostscript, and impose a 4.5MB body limit and 10-second ceiling. On
Vercel the app detects this through `GET /api/health`, hides the
server-dependent formats from the picker, and returns `E006` directing the user
to localhost if one is requested anyway. Do not try to install these engines on
Vercel — install them for local and self-hosted use, where the full matrix works.

## 8. Re-verifying after any change

```bash
pnpm check-engines    # per-engine status; exits 1 if a critical engine is missing
pnpm backend:audit    # the above, followed by the installed version of each npm dep
```

`pnpm backend:audit` is the single command to run when setting up a new machine
or debugging a "works on my machine" report. It prints the engine status followed
by the resolved versions of `sharp`, `jszip`, `file-saver`, `heic2any` and
`browser-image-compression`, so a version mismatch is visible in the same
screenshot as an engine problem.

The two commands have deliberately different exit behaviour:

- `pnpm check-engines` **exits non-zero** when a critical engine is missing. It
  is the CI gate, and a missing engine must fail a build.
- `pnpm backend:audit` **exits zero** regardless. It is a human-facing report,
  and it is most useful precisely when engines *are* missing — so the second half
  is joined with `;` rather than `&&` and always runs. Do not use it as a CI
  gate; use `check-engines` for that.

## 9. Related documents

- `Documents/TRD.md` §14.1 — the authoritative version table and per-OS commands
- `Documents/TRD.md` §14.2 — every environment variable and its default
- `Documents/TRD.md` §14.3 — the detection script specification
- `lib/constants/formats.ts` — which engine each format is routed to
