# Camerlob — Engine Install & Configuration

Camerlob runs fully on `sharp` alone. ImageMagick, LibRaw and Ghostscript extend
the format list; they are not required to start the app, and Camerlob never
installs them for you.

## What you get without installing anything

|                                 | sharp only | + ImageMagick | + LibRaw | + Ghostscript |
| ------------------------------- | ---------- | ------------- | -------- | ------------- |
| jpg, png, webp, tiff, gif, avif | yes        | —             | —        | —             |
| heic / heif **in**              | yes        | —             | —        | —             |
| bmp, ico, pdf                   | no         | yes           | —        | —             |
| heic **out**                    | no         | yes           | —        | —             |
| psd, psb, xcf                   | no         | yes           | —        | —             |
| raw (cr2, nef, arw, dng…)       | no         | —             | yes      | —             |
| eps, ai                         | no         | —             | —        | yes           |

The app reports this honestly: `/api/health` returns `status: "degraded"` when a
required engine is missing, rather than `ok` with a smaller format list.

## Check what this machine has

```bash
pnpm check-engines
```

It prints a per-engine line and exits non-zero when a required engine is missing.
That non-zero exit is expected on a fresh machine and is not a build failure.

## Install

### Debian / Ubuntu

```bash
# critical
sudo apt install imagemagick libraw-dev
# optional
sudo apt install ghostscript
```

### macOS (Homebrew)

```bash
brew install imagemagick libraw ghostscript
```

### Windows (winget)

```powershell
winget install ImageMagick.ImageMagick
winget install darktable.libraw
winget install ArtifexSoftware.GhostScript
```

Full per-platform detail, including the ImageMagick 6 vs 7 binary-name problem,
is in `Documents/MANUAL-INSTALL.md`. This file is the short version; that one is
the runbook.

## Pointing at the binaries

Camerlob reads **only** `lib/constants/env.ts`. No other file touches
`process.env`, and nothing uses `process.env.X || 'default'` — an empty string in
a `.env` file is a real value, not a missing one, and that idiom would hand an
empty path to `spawn`.

| Variable           | Default                  | Used for                               |
| ------------------ | ------------------------ | -------------------------------------- |
| `IMAGEMAGICK_PATH` | `magick`, then `convert` | ImageMagick 7 or 6                     |
| `LIBRAW_PATH`      | `dcraw_emu`              | Raw development                        |
| `GHOSTSCRIPT_PATH` | `gs`                     | PostScript rasterising                 |
| `EXIFTOOL_PATH`    | `exiftool`               | metadata reads                         |
| `TEMP_DIR`         | system temp              | where run-scoped temp dirs are created |

ImageMagick's probe tries the configured path, then `magick`, then `convert`, so
a Homebrew or X11 install that only exposes `convert` is found without
configuration.

## Verifying

```bash
pnpm check-engines     # binary presence and versions
curl localhost:3000/api/health
```

Two things to look for in `/api/health`: the engine you just installed reports
`available: true`, and `status` has moved from `degraded` toward `ok`. Probes are
cached for 60 seconds — restart the dev server, or wait, before concluding the
install did not take.

## When something is wrong

**`E006` on convert.** The engine behind that format is not installed. The
message names the engine. Run `check-engines`.

**`/api/health` says `degraded` but I installed everything.** The binary is on
your `PATH` but not where the process looks, or `IMAGEMAGICK_PATH` is set to a
stale path. `pnpm check-engines` uses the same resolution as the server, so
if it passes and the API disagrees, restart the server — the probe is cached.

**Format listed as a source but the conversion fails with `E001`.** The pair is in
the matrix but no available engine can produce it — the usual case is asking for
`heic` output on a machine with sharp but no ImageMagick. sharp cannot encode
HEVC-in-HEIF; that is a real limitation, not a bug, and it is why the endpoint
reports the _engine_ per target rather than a flat yes/no.
