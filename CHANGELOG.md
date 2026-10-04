# Changelog

All notable changes to Camerlob.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Conversion engine

- Real `sharp` adapter operating on `Buffer`, with EXIF auto-orientation, a
  `MAX_INPUT_PIXELS` guard, per-target encoder settings, and metadata stripped by
  default. Legacy `convertWithSharp(File) → Blob` retained.
- ImageMagick adapter for BMP, ICO, PDF, layered sources (PSD/PSB/XCF) and HEIC
  output. Detects ImageMagick 7 (`magick`) and 6 (`convert`).
- LibRaw adapter for RAW sources, with a two-stage `dcraw_emu` → sharp pipeline,
  a doubled timeout, and DNG remuxed directly.
- Ghostscript adapter for PostScript sources (EPS/AI), invoked with `-dSAFER`,
  rasterising to PNG16M and handing off to sharp for encoding.
- `planExecutionChain` / `executeWithFallback`: ordered fallback chains driven by
  engine availability, with escalation only on retryable errors.
- `EngineName` distinguishes server engines from the browser's `client` step;
  the legacy `EngineKind` API is unchanged.

#### HTTP

- `POST /api/convert` — multipart batch conversion, 1–20 files, concurrency 3,
  inline `dataUrl` results, per-file failures, and a `summary`.
- `GET /api/health` — engine availability with a 60s probe cache and a truthful
  `degraded` status when a required engine is missing.
- `GET /api/formats` and `GET /api/formats/[format]` — the conversion matrix, the
  resolved server engine per target, the `accept` attribute, and a per-target
  reason.

#### Library and documentation

- `lib/utils/magic-bytes.ts` detects formats from file signatures. It takes no
  filename argument at all, so nothing a caller passes can influence the result;
  a mismatch between declared format and actual bytes is E010.
- `lib/utils/temp-files.ts` run-scoped temp directories, removed in a `finally`,
  with interval and max-age sweeps for anything a hard kill leaves behind.
- `lib/convert/engines/spawn.ts` is the only subprocess entry point: `shell: false`,
  argument arrays, bounded output, timeout with child kill.
- Zod request/response schemas in `lib/validation/`, with `types/` kept free of
  runtime code.
- `Documents/BACKEND-ARCHITECTURE.md`, `API-REFERENCE.md`, `FORMAT-MATRIX.md`,
  `ENGINE-INSTALL.md`, `ERROR-CODES.md`.
- `scripts/audit-matrix.ts` — five matrix invariants: real registry endpoints, no
  self-conversion, no empty source, no duplicate pairs, and a writer somewhere in
  the resolved fallback chain. It found the `jfif` row offering a rename as a
  conversion.
- `pnpm run backend:audit` — the matrix audit, then the engine check, then a
  dependency listing.

### Changed

- Alias rows are now identical by construction: `jpg`, `jpeg` and `jfif` are one
  `image/jpeg` format, and the `jfif` row had drifted into dropping HEIC and PDF
  while offering a `jfif -> jpg` rename.
- Format resolution is capability-driven rather than read straight off the matrix
  row, so the chosen engine matches what the installed binaries can actually do.
  sharp's limits are handled honestly: it reads HEIF/HEIC but writes AVIF only,
  and does not handle BMP, ICO, TGA or PPM — those belong to ImageMagick.
- `ImageFormatMeta` uses a single `category` field (`raster`, `layered`,
  `vector`, `raw`, `document`) instead of separate family flags.
- `ErrorDefinition` exposes `http`; `ConversionError` keeps `httpStatus` as a
  derived getter.
- `useFormatMatrix` and `useEngineStatus` document how they consume the API. Both
  read the same constants the routes do, so the two views cannot drift.

### Security

- Client-supplied filenames are sanitised to a bare basename before being joined
  to any path, and are sanitised separately for the download name, the `accept`
  match and the temp name. `../../../../etc/passwd` becomes `passwd.webp`.
- Engine stderr, stack traces and binary paths are never included in a response
  body; they go to the log via `logConversionError`.
- No shell. No string interpolation into a command line. No `child_process.exec`.

### Fixed

- The E001/E010 boundary: an unsupported _pair_ is E001, wrong _bytes_ are E010,
  and a damaged file of the right type is E004.
- The fallback chain no longer retries an input that is corrupt or spoofed, and
  no longer advances past a missing engine more than once.
- Health probes cache failures as well as successes, so a machine without LibRaw
  does not spawn `dcraw_emu` on every request.

### Known limitations

- RAW, layered, BMP, ICO, PDF and HEIC **output** need ImageMagick and/or LibRaw
  installed. The app runs without them and reports `degraded`; it never installs
  them automatically. See `Documents/ENGINE-INSTALL.md`.
- sharp cannot encode HEIC (HEVC-in-HEIF), only AVIF-in-HEIF. Asking for `heic`
  output on a sharp-only machine is a genuine `E001`.
- `cr2 -> dng` and `cr3 -> dng` are TRD-mandated but no available engine writes
  DNG. The LibRaw adapter returns the source bytes unchanged (a remux, so the raw
  data and maker notes are preserved), which means the output keeps the CR2/CR3
  container under a `.dng` name. Software that dispatches on DNG's tag layout may
  not read it. A faithful conversion needs a DNG muxer, which the toolchain does
  not have; `scripts/audit-matrix.ts` records the exception in `REMUX_ONLY`.
- There is no automated test suite yet. Verification to date is typecheck, lint,
  `backend:audit`, and runtime harnesses covering sharp end to end plus argv,
  error-mapping and temp-cleanup behaviour for the three native engines.
