# Camerlob — Technical Requirements Document

## 1. Document Metadata

| Field | Value |
|-------|-------|
| Document Title | Camerlob Technical Requirements Document |
| Project | Camerlob — "Convert any image. Any format. Free. Forever." |
| Version | 1.0 (MVP) |
| Author | YYYY — Solo Developer |
| Date | YYYY-MM-DD |
| Status | Draft |
| Document Type | Technical Requirements Document (TRD) |
| Product Reference | [`Documents/PRD.md`](./PRD.md) |
| Design Reference | [`Documents/UI-UX-BRIEF.md`](./UI-UX-BRIEF.md) |
| License | MIT |

---

## 2. Executive Technical Summary

Camerlob is a single-user, local-first Next.js 14 application that converts images between 40+ formats. The entire product is one Next.js app with two conversion engines, one of which runs in the browser and the other on the local machine. There is no database, no authentication layer, and no object storage, because the product requirement is a tool that never moves a user's image off their disk except as far as their own loopback interface.

**The dual-engine architecture.** The central engineering decision is *where* each conversion executes. A **client engine** built on the Canvas API, `heic2any@0.0.4`, and `magick-wasm` handles every format the browser can already decode or encode — JPG, PNG, WEBP, GIF, BMP, ICO, TIFF, TGA, AVIF, HEIC, HEIF. These conversions are synchronous with the user's own CPU, cost no network round trip, and complete in well under the PRD's 2-second budget for files under 5MB. A **server engine** built on `sharp@0.33.5`, ImageMagick 7, LibRaw 0.21, and Ghostscript 10 handles the long tail: camera RAW (CR2, CR3, NEF, ARW, DNG, ORF, RAF, RW2, PEF, 3FR, MRW, DCR, ERF, MOS, X3F), layered formats (PSD, PSB, XCF), and vector or publication formats (EPS, PS, XPS, PUB, ODD, ODG). These require native decoders with no browser equivalent, and a 40-megapixel RAW buffer cannot be held in a browser tab's heap at acceptable performance.

**Why no database, no auth, no cloud storage.** Every one of those subsystems exists to answer a question — *whose* data is this, and *where* does it live across sessions. Camerlob deliberately answers neither. The application is single-user by design: it runs on one machine, for one person, and conversion state lives in memory in the Zustand store for the duration of a session. Adding a database would mean a migration path, a data-retention policy, and a privacy liability, in exchange for a history feature the PRD lists as an explicit non-goal. Adding auth would mean credential storage, session management, and a login screen, in exchange for an account system the PRD also lists as a non-goal. Adding cloud storage would contradict the product's central claim. The absence is architectural, not deferred.

**Vercel compatibility strategy.** The Vercel deployment is a deliberate reduced surface, not a target the product must fully satisfy. Client-side conversion is pure browser work, so it runs identically on Vercel. The server engine depends on native binaries that serverless function runtimes do not expose, and the platform imposes a 4.5MB request body limit and a 10-second execution ceiling. Rather than pretend otherwise, the app detects engine availability at runtime through `GET /api/health` and gates the UI: on Vercel the server-dependent formats are simply not offered as source formats, and any attempt returns error code `E006` with a message directing the user to localhost. The README and in-app copy state the same constraint.

**Memory and failure model.** Client conversion is bounded by browser heap (roughly 500MB usable per tab), so files above 100MB are rejected client-side before decode rather than mid-convert. Server conversion is bounded by the temp directory and a 50MB per-file ceiling. Both engines are skip-and-continue: a corrupt file produces a per-file error record in the result set while the rest of the batch proceeds, per the PRD's reliability requirement.

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose | Notes |
|-------|-----------|---------|---------|-------|
| Framework | **Next.js** | `next@14.2.35` | App Router, routing, API route handlers | App Router only; no Pages Router |
| Runtime | **Node.js** | `20.11.1` (LTS) | Server engine host, build tooling | Required for LibRaw/ImageMagick invocation |
| Language | **TypeScript** | `typescript@5.4.5` | Type safety across app, lib, and tests | `strict: true`, no `any` in `types/` |
| UI runtime | **React** | `react@18.3.1` | Component runtime | Paired with `react-dom@18.3.1` |
| Package manager | **pnpm** | `pnpm@9.12.3` | Install, workspace scripts | npm 10.9.x is the documented fallback |
| Styling | **Tailwind CSS** | `tailwindcss@3.4.19` | Utility styling, token mapping | Tokens from UI-UX-BRIEF Section 16 |
| UI components | **shadcn/ui** | `2.1.6` (CLI) | Accessible primitives | Copied into `components/ui/`, not a runtime dep |
| Icons | **lucide-react** | `lucide-react@0.400.0` | Icon set | Stroke 1.5 default, 2 for emphasis |
| Animation | **framer-motion** | `framer-motion@11.0.28` | Page and list transitions | Disabled under `prefers-reduced-motion` |
| State management | **zustand** | `zustand@4.5.7` | File queue and job state | Single store, no persistence middleware |
| Form handling | **react-hook-form** | `react-hook-form@7.52.2` | Search field and validation | Minimal surface; see `hooks/useFileQueue.ts` |
| Schema validation | **zod** | `zod@3.23.8` | API request/response parsing | Runtime validation on every route handler |
| Client conversion — Canvas | **Canvas API** | native (browser) | JPG/PNG/WEBP/GIF/BMP/ICO encode + decode | Zero install; primary fast path |
| Client conversion — HEIC | **heic2any** | `heic2any@0.0.4` | HEIC/HEIF decode | `toType` set to target MIME |
| Client conversion — extended | **magick-wasm** | `magick-wasm@0.0.3` | TIFF/TGA/PPM/PSD decode in-browser | WASM asset, lazy-loaded on first use |
| Client compression | **browser-image-compression** | `browser-image-compression@2.0.2` | Pre-encode downscaling for oversize inputs | Opt-in path, not default |
| Server conversion | **sharp** | `sharp@0.33.5` | Fast server encode/decode: JPG, PNG, WEBP, AVIF, TIFF | Prebuilt binaries, no compile step |
| Server conversion | **ImageMagick** | `7.1.1-43` (system binary) | PSD, PSB, XCF, ODD, ODG, PDF, fallback RAW | Invoked via `child_process.spawn` |
| Server conversion | **LibRaw** | `0.21.4` (system binary) | RAW development for all 16 camera formats | Via `dcraw_emu` or `rawtherapee-cli` |
| Server conversion | **Ghostscript** | `10.02.1` (system binary) | Rasterise EPS, PS, XPS | Only required for vector sources |
| Optional | **fluent-ffmpeg** | `fluent-ffmpeg@2.1.3` | Reserved for future video work | Not wired in v1; listed for parity only |
| ZIP creation | **jszip** | `jszip@3.10.1` | Batch archive assembly | Runs client-side in a worker |
| ZIP download | **file-saver** | `file-saver@2.0.5` | Blob to disk | Guarded against Safari download quirks |
| Drag and drop | **react-dropzone** | `react-dropzone@14.3.5` | Dropzone, validation, paste | `useDropzone` in `components/camerlob/UploadZone.tsx` |
| Toasts | **sonner** | `sonner@1.5.0` | Success/error/warning/info toasts | Restyled to Deep Aqua tokens |
| Unit and integration tests | **vitest** | `vitest@1.6.1` | Test runner | jsdom environment for React tests |
| Component tests | **@testing-library/react** | `@testing-library/react@16.0.1` | Interaction assertions | Paired with `jest-dom@6.4.8` |
| E2E tests | **playwright** | `@playwright/test@1.45.3` | Full-flow browser tests | Chromium, Firefox, WebKit projects |
| Linting | **eslint** | `eslint@9.12.0` | Static analysis | Flat config, `eslint-config-next@14.2.35` |
| Formatting | **prettier** | `prettier@3.3.3` | Consistent formatting | No semicolons, single quotes, 2-space |
| TS execution | **tsx** | `tsx@4.19.1` | Run `scripts/check-engines.ts` | `pnpm check-engines` |
| Type declarations | **@types/node** / **@types/react** | `22.9.0` / `18.3.12` | Ambient types | Required for `fs` and `child_process` |

---

## 4. System Architecture

### 4.1 Architecture Diagram

```text
┌───────────────────────────────────────────────────────────────────────┐
│  BROWSER  (Next.js client components)                                 │
│                                                                       │
│  app/(marketing)/page.tsx   app/convert/page.tsx   app/result/page.tsx │
│         │                          │                       ▲           │
│         └──────────────┬───────────┴───────────────────────┘           │
│                        │                                           │
│              lib/convert/router.ts                                   │
│         routeConversion(source, target) → Engine                     │
│                        │                                           │
│         ┌──────────────┴───────────────┐                           │
│         ▼ CLIENT                        ▼ SERVER (localhost only)   │
│  lib/convert/client-converter.ts   POST /api/convert                │
│         │                                   │                        │
│  ┌──────┼──────────┬────────────┐   app/api/convert/route.ts        │
│  ▼      ▼          ▼            ▼            │                      │
│ Canvas  heic2any  magick-     browser-       ▼                      │
│  API  @0.0.4     wasm         image-    zod parse (fields)          │
│  │      │         │          compression  @0.33.5                    │
│  │      │         │            @2.0.2        │                      │
│  │      │         │                │   lib/convert/server-converter.ts│
│  │      │         │                │          │                      │
│  │      │         │                │   ┌──────┼──────────┬────────┐  │
│  │      │         │                │   ▼      ▼          ▼        ▼  │
│  │      │         │                │ sharp  ImageMagick LibRaw Ghost│
│  │      │         │                │ 0.33.5  7.1.1     0.21.4 script│
│  │      │         │                │        @7.1.1    dcraw_emu 10.02│
│  │      │         │                │   │      │          │       │  │
│  └──────┴─────────┴────────────────┘   │      │          │       │  │
│                    │                   │      │          │       │  │
│                    ▼                   │      │          │       │  │
│              Blob / File objects       ▼      ▼          ▼       ▼  │
│                    │              TEMP DIR: $TEMP_UPLOAD_DIR      │
│                    │              /tmp/camerlob/<jobId>/           │
│                    │                 in/ ──► out/                   │
│                    │                   └── unlink in finally{} ──┘    │
│                    ▼                                                 │
│         lib/utils/zip-builder.ts (jszip@3.10.1)                     │
│                    │                                                 │
│                    ▼                                                 │
│         file-saver@2.0.5 → user download                            │
└───────────────────────────────────────────────────────────────────────┘

LOCALHOST:  Browser ◄──HTTP──► 127.0.0.1:3000 (Next.js server) ◄──► /tmp
VERCEL:     Browser ──► static assets only.  /api/convert returns E006.
            No native binary is reachable; client engine only.
```

### 4.2 Routing Decision Tree

`routeConversion(source, target)` in `lib/convert/router.ts` returns an engine. The decision is a pure lookup, executed synchronously, with no I/O.

```text
1. Is the (source → target) pair present in CONVERSION_MATRIX?
   ├─ no  → throw ConversionError('E001', unsupported pair)
   └─ yes → continue

2. Does the matrix entry list a CLIENT engine AND is WebAssembly available
   in navigator AND is the file under MAX_FILE_SIZE_MB (100)?
   ├─ yes → return CLIENT_WASM
   └─ no  → continue

3. Does the matrix entry list a server engine AND is that binary reported
   available by GET /api/health?
   ├─ yes → return the server engine
   └─ no  → throw ConversionError('E006', engine missing)

4. On CLIENT_WASM runtime failure (decode throws, WASM trap, OOM):
   ├─ is the file under SERVER_MAX_FILE_SIZE_MB (50)? → escalate to server
   │  ├─ server succeeds → return result flagged `engine: SERVER_*`, `fallback: true`
   │  └─ server fails   → throw ConversionError('E005', conversion failed)
   └─ no → throw ConversionError('E002', file too large to escalate)
```

The fallback is **one-directional**: client to server, never server to client. RAW formats never enter the client path at all, which is what prevents the browser-out-of-memory risk documented in `Documents/PRD.md` Section 8.

---

## 5. Project Folder Structure

Every directory carries a single responsibility. Line comments below are normative for `package.json` `scripts` wiring and for code review.

```text
Camerlob/
├── app/                                  # Next.js App Router root
│   ├── (marketing)/
│   │   └── page.tsx                      # Landing page (hero, format grid, how-it-works)
│   ├── convert/
│   │   └── page.tsx                      # Converter page (format pickers, dropzone, queue)
│   ├── result/
│   │   └── page.tsx                      # Result page (summary, ZIP, per-file downloads)
│   ├── layout.tsx                        # Root layout: dark theme default, nav, footer, providers
│   ├── globals.css                       # Imports styles/tokens.css, base resets, font-face
│   └── api/
│       ├── convert/
│       │   └── route.ts                  # POST /api/convert — server-side conversion handler
│       ├── health/
│       │   └── route.ts                  # GET /api/health — engine availability probe
│       └── formats/
│           └── route.ts                  # GET /api/formats — serialised conversion matrix
│
├── components/
│   ├── ui/                               # shadcn/ui primitives, restyled with Deep Aqua tokens
│   │   ├── button.tsx                    # Variants: primary | ghost | text | danger | icon
│   │   ├── input.tsx                     # Text input with focus glow and error ring
│   │   ├── select.tsx                    # Searchable format select
│   │   ├── dialog.tsx                    # Backdrop blur(8px) confirmation only
│   │   ├── progress.tsx                  # Determinate + indeterminate shimmer track
│   │   ├── badge.tsx                     # 6 variants at 15% alpha
│   │   └── sonner.tsx                    # Toaster styled to theme tokens
│   └── camerlob/                         # Camerlob-specific feature components
│       ├── FormatPicker.tsx              # Searchable 40+ format card grid (UI-UX 8.8)
│       ├── TargetPicker.tsx              # Filtered target grid, driven by CONVERSION_MATRIX
│       ├── UploadZone.tsx                # react-dropzone wrapper (UI-UX 8.9)
│       ├── FileQueue.tsx                 # Ordered list of accepted files with counter
│       ├── FileCard.tsx                  # Thumbnail, name, size, remove, progress (UI-UX 8.10)
│       ├── ResultSummary.tsx             # "X of Y converted" header with checkmark draw
│       ├── ResultCard.tsx                # Output card with size delta and download
│       ├── FailedFiles.tsx               # Red-bordered list of failures and reasons
│       ├── StepIndicator.tsx             # "1. Formats → 2. Upload → 3. Convert"
│       ├── ThemeToggle.tsx               # Sun/Moon icon button, localStorage-backed
│       └── NavBar.tsx                    # Sticky nav, 80% bg + 12px backdrop blur
│
├── lib/
│   ├── convert/                          # Conversion engine abstraction
│   │   ├── client-converter.ts           # Browser engine: Canvas, heic2any, magick-wasm
│   │   ├── server-converter.ts           # Node engine: sharp, ImageMagick, LibRaw, Ghostscript
│   │   ├── router.ts                     # routeConversion() — pure engine selection + fallback
│   │   └── matrix.ts                     # Re-export of lib/constants/formats.config.ts
│   ├── utils/                            # Framework-agnostic helpers
│   │   ├── file-size.ts                  # formatBytes(): 24.8 MB, 480 KB
│   │   ├── mime.ts                       # Extension → MIME map and reverse lookup
│   │   ├── magic-bytes.ts                # File signature sniffing (see Section 10.4)
│   │   ├── sanitize-filename.ts          # Strip path separators, control chars, reserved names
│   │   ├── zip-builder.ts                # JSZip batch archive assembly
│   │   └── cn.ts                         # Tailwind class merge (shadcn convention)
│   └── constants/                        # Single source of truth for limits and copy
│       ├── formats.config.ts             # 40+ format registry + full conversion matrix
│       ├── limits.ts                     # MAX_FILES, MAX_FILE_SIZE_MB, SERVER_MAX_FILE_SIZE_MB
│       └── error-messages.ts             # E001–E009 user-facing strings
│
├── hooks/                                # Custom React hooks
│   ├── useFileQueue.ts                   # Add/remove/reject files, enforces the 20-file cap
│   ├── useConversion.ts                  # Orchestrates router, concurrency, progress, results
│   ├── useHealthCheck.ts                 # Fetches /api/health once on mount, caches engines
│   └── useTheme.ts                       # Dark default, localStorage sync, no-flash
│
├── types/                                # TypeScript types, no runtime code
│   ├── format.ts                         # ImageFormat union, ImageFormatMeta
│   ├── conversion.ts                     # ConversionPair, ConversionJob, ConversionResult
│   ├── api.ts                            # API request/response contracts
│   └── index.ts                          # Barrel re-export
│
├── store/
│   └── convert-store.ts                  # Zustand store: queue, jobs, results, actions
│
├── styles/
│   ├── tokens.css                        # All CSS custom properties (UI-UX-BRIEF Section 16)
│   └── globals.css                       # Tailwind directives, base layer, reduced-motion block
│
├── scripts/
│   ├── check-engines.ts                  # Probes binaries, prints status report (Section 14.3)
│   └── install-deps.sh                   # Per-OS install helper for native binaries
│
├── tests/
│   ├── unit/                             # vitest, no I/O
│   │   ├── matrix.test.ts                # Matrix integrity: symmetry, one-way flags
│   │   ├── router.test.ts                # Engine selection and fallback branches
│   │   ├── sanitize-filename.test.ts     # Traversal, unicode, reserved Windows names
│   │   └── file-size.test.ts             # Boundary formatting
│   ├── integration/                      # vitest against route handlers with fixture files
│   │   ├── convert-route.test.ts         # One fixture per engine
│   │   └── health-route.test.ts          # Engine detection with PATH overrides
│   ├── e2e/                              # Playwright
│   │   ├── convert-flow.spec.ts          # Landing → convert → result → ZIP download
│   │   └── batch-limit.spec.ts           # 21st file rejected with toast
│   └── fixtures/                         # One small sample per supported format
│
├── public/                               # Static assets, referenced in UI-UX-BRIEF Section 19
│   ├── logo.svg                          # Aperture glyph + wordmark in #00E5FF
│   ├── favicon.ico                       # 32px aperture glyph
│   └── wasm/                             # magick-wasm .wasm assets served from same origin
│
├── Documents/
│   ├── PRD.md                            # Product requirements (source of truth for scope)
│   ├── UI-UX-BRIEF.md                    # Deep Aqua design system
│   └── TRD.md                            # This document
│
├── next.config.js                        # CSP headers, WASM mime, body size limit
├── tailwind.config.ts                    # Maps CSS variables to utility names
├── tsconfig.json                         # strict, path aliases for @/*
├── vercel.json                           # 4.5MB body limit declaration, function maxDuration
├── Dockerfile                            # Optional: Node 20 + ImageMagick + LibRaw + Ghostscript
├── .env.example                          # Section 14.2
└── package.json                          # Section 17
```

---

## 6. Data Models & TypeScript Types

All types live in `types/` and are re-exported from `types/index.ts`. No runtime logic is permitted in this directory.

```ts
// types/format.ts

/** Union of every image extension Camerlob accepts as a source format. */
export type ImageFormat =
  // Consumer raster
  | 'jpg' | 'jpeg' | 'jfif' | 'png' | 'webp' | 'gif' | 'bmp' | 'ico'
  | 'tiff' | 'tif' | 'avif' | 'heic' | 'heif' | 'tga' | 'ppm'
  // Professional
  | 'psd' | 'psb' | 'eps' | 'ps' | 'xps' | 'xcf' | 'pub' | 'odd' | 'odg'
  // RAW camera
  | 'cr2' | 'cr3' | 'crw' | 'nef' | 'arw' | 'dng' | 'orf' | 'raf'
  | 'rw2' | 'pef' | '3fr' | 'mrw' | 'dcr' | 'erf' | 'mos' | 'x3f';

export type FormatCategory = 'consumer-raster' | 'professional' | 'raw-camera';

export interface ImageFormatMeta {
  readonly format: ImageFormat;
  /** Canonical uppercase display label, e.g. "JPG", "CR2". */
  readonly label: string;
  /** Human-readable name shown under the label, e.g. "Canon RAW". */
  readonly displayName: string;
  readonly category: FormatCategory;
  readonly mimeTypes: readonly string[];
  /** Preferred MIME for outbound encoding. */
  readonly primaryMime: string;
  /** True if the browser engine can decode this format. */
  readonly clientCapable: boolean;
  /** True if this format is a source-only family (RAW cannot be an encode target). */
  readonly sourceOnly: boolean;
  /** True if the format carries layers or vectors and can only export to raster. */
  readonly exportOnly: boolean;
  /** First four bytes used for magic-byte sniffing. */
  readonly magicBytes: readonly number[] | null;
}
```

```ts
// types/conversion.ts

import type { ImageFormat } from './format';

export enum ConversionEngine {
  CLIENT_WASM = 'CLIENT_WASM',
  SERVER_SHARP = 'SERVER_SHARP',
  SERVER_IMAGEMAGICK = 'SERVER_IMAGEMAGICK',
  SERVER_LIBRAW = 'SERVER_LIBRAW',
  SERVER_GHOSTSCRIPT = 'SERVER_GHOSTSCRIPT',
}

export interface ConversionPair {
  readonly source: ImageFormat;
  readonly target: ImageFormat;
  readonly engine: ConversionEngine;
  /** True when the reverse direction is intentionally unsupported. */
  readonly oneWay: boolean;
  /** Human-readable reason shown when the pair is unavailable, if oneWay. */
  readonly oneWayReason?: string;
}

export type FileStatus =
  | 'pending'    // accepted, not yet converted
  | 'converting' // currently in an engine
  | 'done'       // output Blob available
  | 'failed';    // engine returned an error; batch continues

export interface UploadedFile {
  readonly id: string;              // crypto.randomUUID()
  readonly name: string;            // original, unsanitised client-side
  readonly size: number;            // bytes
  readonly mime: string;            // sniffed, not extension-derived
  readonly extension: ImageFormat;
  readonly file: File;              // native File handle, not serialisable
  readonly previewUrl: string;      // object URL, revoked on remove
  readonly status: FileStatus;
  readonly error?: ConversionError;
}

export interface ConversionJob {
  readonly id: string;
  readonly file: UploadedFile;
  readonly sourceFormat: ImageFormat;
  readonly targetFormat: ImageFormat;
  readonly engine: ConversionEngine;
  status: FileStatus;
  /** 0–100. 0 for pending; -1 signals indeterminate. */
  progress: number;
  result?: ConversionResult;
  error?: ConversionError;
  startedAt?: number;
  finishedAt?: number;
}

export interface ConversionResult {
  readonly success: true;
  readonly fileId: string;
  readonly outputBlob: Blob;
  readonly outputFilename: string;   // sanitised, extension swapped
  readonly outputSize: number;
  readonly durationMs: number;
  readonly engine: ConversionEngine;
  /** True when a client failure was escalated to the server engine. */
  readonly fallback: boolean;
}

export type ConversionErrorCode =
  | 'E001' | 'E002' | 'E003' | 'E004' | 'E005'
  | 'E006' | 'E007' | 'E008' | 'E009';

export interface ConversionError {
  readonly code: ConversionErrorCode;
  /** User-facing copy, safe to render in a toast. */
  readonly message: string;
  readonly fileId?: string;
  readonly retryable: boolean;
  /** Developer-only detail, written to console and stripped from responses. */
  readonly detail?: string;
}
```

---

## 7. Conversion Matrix (`lib/constants/formats.config.ts`)

The matrix is the single source of truth for both the UI filtering and the router. It is a plain frozen object with no imports, so it can be serialised directly by `GET /api/formats`. Engine precedence within an array is first-match-wins.

```ts
// lib/constants/formats.config.ts

export const CONVERSION_MATRIX = {
  // ---- Consumer raster: client engine handles all of these ----
  jpg:     { targets: ['png','webp','avif','gif','bmp','tiff','ico','heic','pdf'], engine: 'CLIENT_WASM' },
  jpeg:    { targets: ['png','webp','avif','gif','bmp','tiff','ico','heic','pdf'], engine: 'CLIENT_WASM' },
  jfif:    { targets: ['png','webp','avif','jpg'],                 engine: 'CLIENT_WASM' },
  png:     { targets: ['jpg','webp','avif','gif','bmp','tiff','ico','pdf'], engine: 'CLIENT_WASM' },
  webp:    { targets: ['png','jpg','avif','gif','tiff'],            engine: 'CLIENT_WASM' },
  gif:     { targets: ['png','webp','jpg','avif'],                 engine: 'CLIENT_WASM' },
  bmp:     { targets: ['png','jpg','webp','tiff','ico'],           engine: 'CLIENT_WASM' },
  ico:     { targets: ['png','jpg','webp','bmp'],                   engine: 'CLIENT_WASM' },
  tiff:    { targets: ['png','jpg','webp','avif'],                  engine: 'CLIENT_WASM' },
  tif:     { targets: ['png','jpg','webp','avif'],                  engine: 'CLIENT_WASM' },
  avif:    { targets: ['jpg','png','webp'],                         engine: 'CLIENT_WASM' },
  heic:    { targets: ['jpg','png','webp','avif'],                  engine: 'CLIENT_WASM' },
  heif:    { targets: ['jpg','png','webp','avif'],                  engine: 'CLIENT_WASM' },
  tga:     { targets: ['png','jpg','webp','tiff'],                  engine: 'CLIENT_WASM' },
  ppm:     { targets: ['png','jpg','webp','tiff'],                  engine: 'CLIENT_WASM' },

  // ---- RAW camera: LibRaw develop, then sharp encode. Source-only. ----
  cr2:     { targets: ['jpg','png','tiff','webp','dng'],            engine: 'SERVER_LIBRAW' },
  cr3:     { targets: ['jpg','png','tiff','webp','dng'],            engine: 'SERVER_LIBRAW' },
  crw:     { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },
  nef:     { targets: ['jpg','png','tiff','webp'],                  engine: 'SERVER_LIBRAW' },
  arw:     { targets: ['jpg','png','tiff','webp'],                  engine: 'SERVER_LIBRAW' },
  dng:     { targets: ['jpg','png','tiff','webp'],                  engine: 'SERVER_LIBRAW' },
  orf:     { targets: ['jpg','png','tiff'],                          engine: 'SERVER_LIBRAW' },
  raf:     { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },
  rw2:     { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },
  pef:     { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },
  '3fr':   { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },
  mrw:     { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },
  dcr:     { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },
  erf:     { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },
  mos:     { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },
  x3f:     { targets: ['jpg','png','tiff'],                         engine: 'SERVER_LIBRAW' },

  // ---- Layered and vector: export to raster only, one-way. ----
  psd:     { targets: ['jpg','png','webp','tiff'], engine: 'SERVER_IMAGEMAGICK', oneWay: true,
             reason: 'Layered formats export to raster; a raster image cannot become layered.' },
  psb:     { targets: ['jpg','png','webp','tiff'], engine: 'SERVER_IMAGEMAGICK', oneWay: true,
             reason: 'Layered formats export to raster; a raster image cannot become layered.' },
  xcf:     { targets: ['jpg','png','tiff'],         engine: 'SERVER_IMAGEMAGICK', oneWay: true,
             reason: 'GIMP project files export to raster only.' },
  eps:     { targets: ['jpg','png','tiff','pdf'],   engine: 'SERVER_GHOSTSCRIPT', oneWay: true,
             reason: 'Vector formats export to raster; paths cannot be recovered from a bitmap.' },
  ps:      { targets: ['jpg','png','tiff','pdf'],   engine: 'SERVER_GHOSTSCRIPT', oneWay: true,
             reason: 'Vector formats export to raster; paths cannot be recovered from a bitmap.' },
  xps:     { targets: ['jpg','png','tiff'],         engine: 'SERVER_GHOSTSCRIPT', oneWay: true,
             reason: 'XPS packages export to raster only.' },
  pub:     { targets: ['jpg','png','tiff','pdf'],   engine: 'SERVER_IMAGEMAGICK', oneWay: true,
             reason: 'Publication files export to raster only.' },
  odd:     { targets: ['jpg','png','tiff','pdf'],   engine: 'SERVER_IMAGEMAGICK', oneWay: true,
             reason: 'Publication files export to raster only.' },
  odg:     { targets: ['jpg','png','tiff','pdf'],   engine: 'SERVER_IMAGEMAGICK', oneWay: true,
             reason: 'Publication files export to raster only.' },
} as const;

export type MatrixSource = keyof typeof CONVERSION_MATRIX;
```

**One-way and source-only rules enforced in code.**

- `psd`, `psb`, `xcf`, `eps`, `ps`, `xps`, `pub`, `odd`, `odg` appear only as matrix keys, never as target values. Layer and vector structure is not synthesisable from a bitmap.
- RAW formats appear only as matrix keys. They are decoders; there is no RAW encoder.
- `pdf` appears only as a target. It is an output format, not a source — the PRD lists PDF-to-image as an explicit non-goal, and no PDF reader is included.
- `dng` is the single exception: CR2 and CR3 may target DNG because it is a documented, lossless RAW container. No other source targets it.
- `tests/unit/matrix.test.ts` asserts these invariants and fails the build on regression.

---

## 8. API Contracts

All routes are `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`. Every response sets `Cache-Control: no-store`.

### 8.1 `POST /api/convert`

Server-side conversion endpoint. Available on localhost only. All request and response bodies are validated with `zod` before any binary is spawned.

| Property | Value |
|----------|-------|
| Method | `POST` |
| Content-Type | `multipart/form-data` |
| Success status | `200` |
| Max files per request | 20 |
| Max file size | 50MB per file (`SERVER_MAX_FILE_SIZE_MB`) |
| Max total request | 500MB |

```ts
// types/api.ts

export interface ConvertRequest {
  sourceFormat: ImageFormat;
  targetFormat: ImageFormat;
  files: File[];                 // 1–20 entries
}

export interface ConvertedFileDTO {
  fileId: string;
  filename: string;              // sanitised, extension swapped
  outputBase64: string;          // base64, no data: prefix
  outputSize: number;            // bytes
  durationMs: number;
  engine: ConversionEngine;
  fallback: boolean;
}

export interface ConvertResponse {
  success: true;
  converted: ConvertedFileDTO[];
  failed: Array<{
    fileId: string;
    filename: string;
    code: ConversionErrorCode;
    message: string;
  }>;
  totalDurationMs: number;
}

export interface ErrorResponse {
  success: false;
  code: ConversionErrorCode;
  message: string;
}
```

**Status codes.**

| Status | Code | Condition | Response |
|--------|------|-----------|----------|
| 200 | — | At least one file converted | `ConvertResponse`; partial failures live in `failed[]` |
| 400 | `E001` | Missing `sourceFormat` or `targetFormat`; unparseable multipart | `ErrorResponse` |
| 400 | `E003` | More than 20 files in the request | `ErrorResponse` |
| 413 | `E002` | Any file over 50MB, or request body over 500MB | `ErrorResponse` |
| 415 | `E001` | Pair absent from `CONVERSION_MATRIX`, or format is source-only as a target | `ErrorResponse` |
| 500 | `E005` | Engine threw; every file in the batch failed | `ErrorResponse` with `detail` in the server log only |
| 500 | `E006` | Required binary not found on `PATH` or at the configured env path | `ErrorResponse` naming the missing binary |
| 500 | `E007` | Engine exceeded the 60s per-file timeout | `ErrorResponse` |
| 500 | `E008` | Node process out of memory or WASM abort | `ErrorResponse` |
| 500 | `E009` | Unclassified throw | `ErrorResponse`; full stack logged, never serialised |

**Note on 200 vs 500.** A 200 is returned whenever at least one file succeeded, even if others failed, because the PRD's reliability requirement is skip-and-continue. `failed[]` carries the per-file reason. A 500 is reserved for total batch failure.

**Reference handler skeleton.**

```ts
// app/api/convert/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAX_FILES, SERVER_MAX_FILE_SIZE_MB, MAX_BATCH_SIZE_MB } from '@/lib/constants/limits';
import { isPairSupported } from '@/lib/constants/formats.config';
import { convertOnServer } from '@/lib/convert/server-converter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fieldSchema = z.enum([...SUPPORTED_SOURCE_FORMATS]);

export async function POST(request: Request): Promise<NextResponse> {
  const started = Date.now();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, code: 'E001', message: 'Malformed request body.' },
      { status: 400 },
    );
  }

  const parsed = fieldSchema.safeParse(form.get('sourceFormat'));
  const parsedTarget = fieldSchema.safeParse(form.get('targetFormat'));
  if (!parsed.success || !parsedTarget.success) {
    return NextResponse.json(
      { success: false, code: 'E001', message: 'sourceFormat and targetFormat are required.' },
      { status: 400 },
    );
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { success: false, code: 'E001', message: 'No files supplied.' },
      { status: 400 },
    );
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { success: false, code: 'E003', message: `Maximum ${MAX_FILES} files per batch.` },
      { status: 400 },
    );
  }

  const oversize = files.find((f) => f.size > SERVER_MAX_FILE_SIZE_MB * 1024 * 1024);
  if (oversize || totalBytes(files) > MAX_BATCH_SIZE_MB * 1024 * 1024) {
    return NextResponse.json(
      { success: false, code: 'E002', message: 'Payload too large.' },
      { status: 413 },
    );
  }

  if (!isPairSupported(parsed.data, parsedTarget.data)) {
    return NextResponse.json(
      { success: false, code: 'E001', message: 'Unsupported conversion pair.' },
      { status: 415 },
    );
  }

  const { converted, failed } = await convertOnServer({
    files,
    sourceFormat: parsed.data,
    targetFormat: parsedTarget.data,
  });

  if (converted.length === 0) {
    return NextResponse.json(
      { success: false, code: 'E005', message: 'All files failed to convert.' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, converted, failed, totalDurationMs: Date.now() - started },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
```

### 8.2 `GET /api/health`

Probes which server engines are reachable. Called once on mount by `hooks/useHealthCheck.ts`; the result gates which formats the UI offers as targets.

```ts
export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  engines: {
    client: boolean;        // always true in a supporting browser
    sharp: boolean;
    imagemagick: boolean;
    libraw: boolean;
    ghostscript: boolean;
  };
  paths?: {                 // present only when status is 'degraded'
    imagemagick: string | null;
    libraw: string | null;
    ghostscript: string | null;
  };
}
```

| Status | When |
|--------|------|
| 200 | Handler executed, regardless of engine availability |
| 503 | Reserved; not used in v1 |

Example degraded response on Vercel, where no binary is reachable:

```json
{
  "status": "degraded",
  "version": "1.0.0",
  "engines": { "client": true, "sharp": false, "imagemagick": false, "libraw": false, "ghostscript": false },
  "paths": { "imagemagick": null, "libraw": null, "ghostscript": null }
}
```

When `status` is `degraded` and `imagemagick`, `libraw`, and `ghostscript` are all `false`, the client treats the environment as Vercel and hides every server-dependent source format from the format picker, replacing them with a `LOCAL ONLY` badge per `Documents/UI-UX-BRIEF.md` Section 8.16.

### 8.3 `GET /api/formats`

Returns the matrix and the format registry so dropdown filtering is driven by one server artefact rather than duplicated client logic. The route imports the same frozen object the router uses.

```ts
export interface FormatsResponse {
  formats: ImageFormatMeta[];              // 40 entries
  matrix: Record<string, { targets: string[]; engine: string; oneWay: boolean }>;
  limits: { maxFiles: number; maxFileSizeMb: number; serverMaxFileSizeMb: number };
}
```

| Status | When |
|--------|------|
| 200 | Always |
| 500 | `E009` on serialisation failure |

---

## 9. Conversion Pipeline

### 9.1 Client-Side Pipeline

```text
File (browser File object)
  → FileReader / file.arrayBuffer()          // zero-copy where supported
  → [HEIC/HEIF] heic2any.toBlob()            // full decode, no Canvas needed
  → [TIFF/TGA/PPM/PSD/ICO] magick-wasm       // WASM build of ImageMagick
  → createImageBitmap()                      // modern decode path
  → <canvas> drawImage()                     // rasterise into a 2D context
  → canvas.toBlob(mime, quality)             // encode to target
  → Blob → object URL → preview / download
```

**Library selection rules.**

| Condition | Library | Reason |
|-----------|---------|--------|
| Source is `heic` or `heif` | `heic2any@0.0.4` | No browser can decode HEIC natively |
| Source is `tiff`, `tga`, `ppm`, `psd`, `psb` | `magick-wasm@0.0.3` | No browser encoder exists for these |
| Source is `jpg`, `jpeg`, `jfif`, `png`, `webp`, `gif`, `bmp`, `avif` | Canvas `drawImage` + `toBlob` | Native, no WASM payload, fastest path |
| Source is `ico` | `magick-wasm@0.0.3` | Chrome refuses to decode `.ico` via `Image` |
| Input exceeds 100MB | `browser-image-compression@2.0.2` before decode | Keeps the decoded buffer inside heap budget |

**Target encoding.**

| Target | Encoder | Quality | Notes |
|--------|---------|---------|-------|
| `jpg` | `canvas.toBlob('image/jpeg', 0.92)` | 0.92 | Default; matches perceptual quality at typical web sizes |
| `png` | `canvas.toBlob('image/png')` | n/a | Lossless; no quality argument |
| `webp` | `canvas.toBlob('image/webp', 0.85)` | 0.85 | Safari 14+ required |
| `avif` | `canvas.toBlob('image/avif', 0.80)` | 0.80 | Feature-detected; falls back to `webp` with an `Info` toast |
| `gif` | `canvas.toBlob('image/gif')` | n/a | First frame only; see below |
| `bmp` | `magick-wasm` encode | n/a | Canvas has no BMP encoder |
| `tiff` | `magick-wasm` encode | n/a | Canvas has no TIFF encoder |
| `ico` | `magick-wasm` encode | n/a | Single-size, 256px |
| `heic` | `heic2any` | n/a | Only for a `heic` target; documented as lossy-through-JPEG |

**Memory management.** Browsers allow roughly 500MB of JS heap per tab. A decoded 6000x4000 RGBA bitmap occupies about 91MB before encoding and again for the encoded Blob. Budget rules:

- Reject any single input above `MAX_FILE_SIZE_MB` (100) client-side with `E002` before decoding.
- Call `canvas.width = 0` and `canvas.height = 0` immediately after `toBlob` to release the backing store.
- Revoke every `URL.createObjectURL` on file removal and on route change.
- Convert at most **three** files concurrently. `useConversion.ts` runs a semaphore; concurrency above three reliably triggers `E008` on 16MP sources.
- `magick-wasm` is dynamically `import()`ed on first use so its several-megabyte `.wasm` payload is not in the initial bundle.

**Animated GIF handling.** Source GIFs are decoded frame by frame. The default is **flatten to first frame** because a single canvas cannot hold animation, and multi-frame output is not an MVP feature. If a GIF is a target, the same rule applies. Where a user-visible consequence exists, the result card's size line carries an `Info` badge reading `ANIMATION FLATTENED`, so the behaviour is disclosed rather than silent. Preserving animation would require gif.js or a WebCodecs pipeline, both deferred past v1.

### 9.2 Server-Side Pipeline

```text
FormData file
  → mkdir -p $TEMP_UPLOAD_DIR/<jobId>/{in,out}
  → arrayBuffer() → fs.writeFile(in/<sanitised-name>)
  → engine dispatch by routeConversion() result
       SERVER_SHARP        → sharp(input).toFormat(target)
       SERVER_LIBRAW       → dcraw_emu -h -c -w <in> → ppm → sharp → target
       SERVER_IMAGEMAGICK  → magick <in>[0] -background white -alpha remove <out>
       SERVER_GHOSTSCRIPT  → gs -sDEVICE=png16m -r<density> -o <out> <in>
  → read out/ buffer → base64
  → rm -rf $TEMP_UPLOAD_DIR/<jobId>/   (finally block, always runs)
  → JSON response
```

**sharp pipeline** (`lib/convert/server-converter.ts`, `SERVER_SHARP`). Handles JPG, PNG, WEBP, AVIF, TIFF, and acts as the final encoder for RAW output.

```ts
const pipeline = sharp(inputPath, { limitInputPixels: 268402689, failOn: 'error' })
  .rotate()                                   // honour EXIF orientation
  .flatten({ background: '#FFFFFF' })          // composite alpha before JPEG
  .toFormat(targetFormat, {
    jpeg: { quality: 92, mozjpeg: true },
    webp: { quality: 85 },
    avif: { quality: 60 },
    png:  { compressionLevel: 9 },
  });
await pipeline.toFile(outputPath);
```

`limitInputPixels` is set explicitly to 268MP so a decompression bomb fails fast with `E004` instead of exhausting the heap.

**ImageMagick pipeline** (`SERVER_IMAGEMAGICK`). Handles PSD, PSB, XCF, PUB, ODD, ODG, and acts as a RAW fallback when LibRaw is absent. Spawned with an argument array — never a shell string — to eliminate injection surface.

```ts
const args = [
  inputPath + '[0]',              // first frame/page only
  '-background', 'white',
  '-alpha', 'remove',
  '-alpha', 'off',
  '-colorspace', 'sRGB',
  outputPath,
];
await spawnWithTimeout(IMAGEMAGICK_PATH, args, 60_000);
```

**LibRaw pipeline** (`SERVER_LIBRAW`). All 16 RAW formats develop through `dcraw_emu`, which outputs a 16-bit linear PPM, then encode through sharp.

```ts
// Step 1 — develop RAW to a flat PPM (16-bit, linear, no demosaic artefacts)
await spawnWithTimeout(LIBRAW_PATH, [
  '-h',            // half-size preview for speed
  '-c',            // centre-crop
  '-w',            // balanced white balance
  '-4',            // 16-bit linear output
  inputPath,
], 45_000);

// Step 2 — encode the developed PPM to the target format
await sharp(ppmPath).toFormat(targetFormat, { quality: 92 }).toFile(outputPath);
```

The `-h` half-size flag is what keeps RAW inside the 10-second budget from the PRD. A full-resolution `-h`-less develop is available behind a debug flag only.

**Ghostscript pipeline** (`SERVER_GHOSTSCRIPT`). Required only for EPS, PS, and XPS. Ghostscript is AGPL-licensed, so it is invoked as an external binary the user installs separately rather than bundled or redistributed — see Section 18.

```ts
const args = [
  '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dQUIET',
  '-sDEVICE=png16m',
  '-dEPSCrop',
  '-r300',                                   // 300 DPI rasterisation density
  `-sOutputFile=${outputPath}`,
  inputPath,
];
await spawnWithTimeout(GHOSTSCRIPT_PATH, args, 45_000);
```

**Temp file cleanup.** Every job creates `path.join(TEMP_UPLOAD_DIR, jobId)`. The handler wraps all work in `try/finally`, and the `finally` block calls `fs.rm(jobDir, { recursive: true, force: true })`. A `setInterval` sweeper in `instrumentation.ts` deletes any job directory older than 1 hour, covering the case where the process is killed mid-conversion. Temp files are never persisted beyond the response and are never written anywhere other than `TEMP_UPLOAD_DIR`.

### 9.3 Router Logic

```ts
// lib/convert/router.ts  (pseudocode-form implementation contract)

export async function runConversion(
  file: File,
  source: ImageFormat,
  target: ImageFormat,
  options: { health: HealthResponse },
): Promise<ConversionResult> {

  // 1. Pair validation
  const entry = CONVERSION_MATRIX[source];
  if (!entry || !entry.targets.includes(target)) {
    throw err('E001', 'That conversion is not supported.', { retryable: false });
  }

  // 2. Engine selection
  let engine = entry.engine === 'CLIENT_WASM' && supportsWasm()
    ? ConversionEngine.CLIENT_WASM
    : entry.engine;

  // 3. Client capability gate
  if (engine === ConversionEngine.CLIENT_WASM && !isClientCapable(source)) {
    engine = entry.engine;   // already server-side; no change
  }

  // 4. Engine availability gate
  if (engine !== ConversionEngine.CLIENT_WASM && !isEngineAvailable(engine, options.health)) {
    throw err('E006', `${engineLabel(engine)} is not available on this machine.`, { retryable: false });
  }

  // 5. Execute, with client → server escalation
  try {
    if (engine === ConversionEngine.CLIENT_WASM) {
      return await convertOnClient(file, source, target);
    }
    return await convertOnServer({ files: [file], sourceFormat: source, targetFormat: target });
  } catch (clientError) {

    const escalatable =
      engine === ConversionEngine.CLIENT_WASM &&
      isEscalatable(clientError.code) &&            // E004, E005, E008
      file.size <= SERVER_MAX_FILE_SIZE_MB * 1024 * 1024;

    if (!escalatable) throw clientError;

    if (!isEngineAvailable(entry.engine === 'SERVER_LIBRAW'
      ? ConversionEngine.SERVER_LIBRAW
      : ConversionEngine.SERVER_SHARP, options.health)) {
      throw err('E006', 'Client conversion failed and no server engine is available.', {
        retryable: true, detail: String(clientError),
      });
    }

    const result = await convertOnServer({ files: [file], sourceFormat: source, targetFormat: target });
    return { ...result, fallback: true };   // surface in the UI-UX-BRIEF badge
  }
}
```

`isEscalatable` deliberately excludes `E002` (too large) and `E003` (too many files): neither becomes solvable by moving work to the server, and retrying would waste the user's time. `E008` is escalatable but capped by the 50MB server ceiling, which is checked before the network call is made.

---

## 10. File Handling & Limits

### 10.1 Hard Limits

| Limit | Value | Token | Enforced In |
|-------|-------|-------|-------------|
| Files per batch | 20 | `MAX_FILES` | `useFileQueue.ts`, `POST /api/convert` |
| Max file size (client) | 100MB | `MAX_FILE_SIZE_MB` | `useFileQueue.ts` before decode |
| Max file size (server) | 50MB | `SERVER_MAX_FILE_SIZE_MB` | `POST /api/convert` |
| Max total batch | 500MB | `MAX_BATCH_SIZE_MB` | `POST /api/convert` |
| Max concurrent conversions | 3 | `MAX_CONCURRENCY` | `useConversion.ts` semaphore |
| Per-file engine timeout | 60s | `ENGINE_TIMEOUT_MS` | `spawnWithTimeout` |

The 20-file limit is a **hard block**, not a warning. Adding a 21st file is rejected with an `Error` toast (`E003`) and the file is discarded; it is never queued and never silently dropped. This matches the UI-UX-BRIEF Section 18 prohibition on softening the limit.

### 10.2 MIME Types per Format

| Format | Accepted MIME types |
|--------|---------------------|
| jpg, jpeg, jfif | `image/jpeg`, `image/jpg`, `image/pjpeg` |
| png | `image/png` |
| webp | `image/webp` |
| gif | `image/gif` |
| bmp | `image/bmp`, `image/x-ms-bmp` |
| ico | `image/x-icon`, `image/vnd.microsoft.icon` |
| tiff, tif | `image/tiff` |
| avif | `image/avif` |
| heic | `image/heic`, `image/heif` |
| heif | `image/heif`, `image/heic` |
| tga | `image/x-tga`, `image/tga` |
| ppm | `image/x-portable-pixmap` |
| psd, psb | `image/vnd.adobe.photoshop`, `application/octet-stream` |
| eps, ps | `application/postscript`, `application/eps` |
| xps | `application/oxps` |
| xcf | `application/x-xcf`, `application/octet-stream` |
| pub, odd, odg | `application/x-mspublisher`, `application/vnd.ms-publisher`, `application/octet-stream` |
| All RAW (`cr2`…`x3f`) | `image/x-raw`, `image/x-canon-cr2`, `image/x-nikon-nef`, `image/x-sony-arw`, `application/octet-stream` |

RAW and professional containers frequently ship as `application/octet-stream` or with an empty MIME. The extension check and magic-byte sniff are therefore authoritative; the MIME is treated as a hint, never as a rejection criterion on its own.

### 10.3 Validation Sequence

Run in order; the first failure rejects the file with a specific code.

1. **Extension check** — `path.extname(file.name)` lowercased must be a key in `CONVERSION_MATRIX`, and must equal the user-selected source format. Mismatch rejects with `E001` and a toast naming both the declared and the detected extension.
2. **Count check** — queue length after add must be ≤ 20, else `E003`.
3. **Size check** — client gate at 100MB, server gate at 50MB, else `E002`.
4. **Empty file check** — `file.size === 0` rejects with `E004`.
5. **Magic-byte sniff** — read the first 12 bytes; compare against `ImageFormatMeta.magicBytes`. A mismatch is a warning in development and a rejection in production, since a mislabelled extension is the leading cause of `E004` downstream.

### 10.4 Magic Bytes Reference

| Format | Signature (hex) |
|--------|-----------------|
| jpg, jpeg, jfif | `FF D8 FF` |
| png | `89 50 4E 47 0D 0A 1A 0A` |
| gif | `47 49 46 38` (`GIF8`) |
| webp | `52 49 46 46` (`RIFF`) then `57 45 42 50` (`WEBP`) at offset 8 |
| bmp | `42 4D` (`BM`) |
| ico | `00 00 01 00` |
| tiff, tif | `49 49 2A 00` or `4D 4D 00 2A` |
| avif | `66 74 79 70` (`ftyp`) then `avif` at offset 8 |
| heic, heif | `66 74 79 70` (`ftyp`) then `heic`/`mif1`/`heix` at offset 8 |
| psd, psb | `38 42 50 53` (`8BPS`) |
| tga | no signature; footer `TRUEVISION-XFILE` at EOF−18 |
| ppm | `50 36` (`P6`) or `50 33` (`P3`) |
| pdf | `25 50 44 46` (`%PDF`) — target only |
| eps, ps | `25 21` (`%!`) followed by `PS-Adobe` |
| xcf | `67 69 6D 70` (`gimp`) |
| RAW family | Camera-specific and inconsistent; sniff by extension plus non-null decode rather than signature |

### 10.5 Filename Sanitisation

`lib/utils/sanitize-filename.ts` runs on every name before it touches disk, before it enters a ZIP entry, and before it is used in a `Content-Disposition` header.

- Strips directory components: `/`, `\`, and any `..` segment.
- Removes control characters (`U+0000`–`U+001F`, `U+007F`) and the Windows-reserved set `< > : " | ? *`.
- Truncates the stem to 180 characters to stay inside filesystem `NAME_MAX` once the extension is appended.
- Preserves Unicode letters so non-Latin filenames survive round-trip.
- Collisions inside a single batch are disambiguated with a `-2`, `-3` suffix rather than overwriting.
- Replaces Windows device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) with a prefixed underscore.

---

## 11. Error Handling Strategy

| Code | Name | Meaning | HTTP | Retryable | User-facing message |
|------|------|---------|------|-----------|---------------------|
| `E001` | Unsupported format pair | The (source, target) pair is absent from the matrix, or the target is a source-only family | 400 / 415 | No | "That conversion isn't supported." |
| `E002` | File too large | File exceeds the 100MB client or 50MB server ceiling, or the batch exceeds 500MB | 413 | No | "This file is too large to convert." |
| `E003` | Too many files | Batch would exceed `MAX_FILES` (20) | 400 | No | "Maximum 20 files per batch." |
| `E004` | Corrupt file | Magic-byte mismatch, truncated payload, or engine decode failure | 500 (per-file) | No | "This file appears to be damaged or isn't really a **{format}** file." |
| `E005` | Client-side conversion failed | Canvas, WASM, or `heic2any` threw for a non-specific reason | 500 | Yes | "Couldn't convert this file in your browser. Retrying on the server." |
| `E006` | Server-side engine missing | Required binary is absent from `PATH` or the configured env path | 500 | No | "**{engine}** isn't installed. Run `pnpm check-engines`." |
| `E007` | Server-side conversion timeout | Engine exceeded `ENGINE_TIMEOUT_MS` (60s) and was killed | 500 | Yes | "This file took too long to convert and was stopped." |
| `E008` | Out of memory | Browser heap exhausted, or Node aborted the allocation | 500 | No | "Ran out of memory. Try fewer or smaller files." |
| `E009` | Unknown error | Unclassified throw | 500 | Yes | "Something went wrong. Please try again." |

**Retry and fallback logic.** `E005` and `E007` are the only codes that trigger the client-to-server escalation in `lib/convert/router.ts`, and escalation happens at most once per file — a server failure after escalation is final, and is never retried again in the same batch. `E007` additionally permits one automatic retry with the ImageMagick fallback path when the failing engine was LibRaw, since RAW development timeouts are frequently a `-h` flag issue rather than a real hang.

**Escalation and retry matrix.**

| Code | Escalate client → server? | Auto-retry? | Surface in `failed[]`? |
|------|---------------------------|-------------|--------------------------|
| E001 | No | No | Yes |
| E002 | No — too large to escalate | No | Yes |
| E003 | No | No | Batch-level only |
| E004 | Yes, if under 50MB | No | Yes |
| E005 | Yes, if under 50MB | No | Yes |
| E006 | No — engine is the escalation | No | Yes |
| E007 | Yes, if under 50MB | Once, on the ImageMagick path | Yes |
| E008 | Yes, if under 50MB | No | Yes |
| E009 | Yes, if under 50MB | No | Yes |

**Developer logs versus user copy.** `ConversionError.detail` carries the stack trace, the spawn argv, the binary's stderr, or the WASM trap message. It is written with `console.error` under a `[camerlob]` prefix and is **never** included in an API response body or a toast. User-facing `message` strings live in `lib/constants/error-messages.ts` and contain no file paths, no stack frames, and no binary names except where the binary name is itself the actionable instruction (`E006`). Because there is no telemetry, the developer log is the only diagnostic surface in v1; the README instructs contributors to paste it into issues.

---

## 12. Performance Requirements

| Metric | Target | Measurement | Notes |
|--------|--------|-------------|-------|
| Client conversion, file < 5MB | < 2s | `performance.now()` around `runConversion` | PRD Section 8 budget |
| Server conversion via sharp, file < 20MB | < 3s | Same, server-side log line | Includes spawn overhead |
| RAW conversion via LibRaw, per file | < 10s | Same, `-h` half-size develop | PRD Section 8 budget |
| Batch of 20 files | < 60s | Wall clock from first job start to last finish | Concurrency 3 |
| ZIP generation, 20 files | < 5s | Wrap the JSZip call | Runs in a Web Worker |
| First Contentful Paint, localhost | < 1.5s | Lighthouse, desktop preset, dev server excluded | Use a production build |
| Lighthouse Performance | ≥ 95 | Lighthouse CI | Measured against `pnpm run build && pnpm run start` |
| Lighthouse Accessibility | ≥ 95 | Lighthouse CI | Must match `Documents/UI-UX-BRIEF.md` Section 13 |
| Lighthouse Best Practices | ≥ 95 | Lighthouse CI | No third-party scripts |
| Time to interactive, converter page | < 2s | Lighthouse TTI metric | `magick-wasm` must stay lazy |

**Performance engineering commitments.**

- `magick-wasm` is dynamically imported on first use. Its `.wasm` payload must not appear in the initial bundle for the landing or converter page.
- `sharp` and the child-process modules are imported only inside the route handler, never in a client component, keeping them out of the browser bundle entirely.
- Result Blobs are held in memory as Blobs, never as base64 strings, in the client store. Base64 is materialised only in the API response and immediately decoded back to a Blob on receipt.
- The ZIP build runs in a Web Worker so a 20-file archive does not block the main thread and freeze the result grid.
- `sharp` is configured with `sharp.cache(false)` in route handlers; a long-lived cache is a memory leak in a long-running local server.

---

## 13. Security & Privacy

**Data locality.** In localhost mode no user image leaves the machine. The only network request carrying image data is `POST http://127.0.0.1:3000/api/convert`, which is a loopback call to the user's own process. There is no CDN, no object storage, no upload endpoint, and no third-party service in the dependency tree that receives a File object.

**Absence of instrumentation.** No analytics, no telemetry, no error reporting SDK, no session replay, no pixel, no third-party script of any kind. `next.config.js` sets a `Content-Security-Policy` that makes this enforceable rather than aspirational:

```js
// next.config.js (excerpt)
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'",   // required by magick-wasm
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",                      // Tailwind runtime
  "img-src 'self' blob: data:",
  "connect-src 'self'",                                    // loopback only
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ]},
    ];
  },
};
```

`'wasm-unsafe-eval'` is present solely because `magick-wasm` instantiates WebAssembly. If that dependency is removed, the directive goes with it. `'unsafe-eval'` is likewise required by the Next.js dev server only and should be dropped from a production header set.

**Temp file hygiene.**

- All writes go to `TEMP_UPLOAD_DIR` (`/tmp/camerlob`), never the project directory, never the user's home.
- The job directory is removed in a `finally` block, so it is deleted on success, on error, and on thrown validation failure.
- `instrumentation.ts` runs a one-hour sweeper for directories orphaned by a process kill.
- Directory permissions are `0700`; files are `0600`.
- Server logs record file count, byte count, engine, and duration. They never record filenames, file contents, or absolute source paths.

**Command execution safety.** All binary invocations use `child_process.spawn` with an argument array and `shell: false`. No command string is ever constructed from user input. The only user-controlled values reaching argv are a fully sanitised filename, a validated target format drawn from the frozen matrix, and fixed numeric flags.

**No tracking state.** No cookies are set. The only persisted client state is `camerlob-theme` in `localStorage`, a functional preference for the dark/light toggle. No cookie banner is required and none is shown.

**Path traversal defence.** `sanitize-filename.ts` is applied before every `fs.writeFile`. Additionally, `path.resolve` output for every job directory is asserted to start with `path.resolve(TEMP_UPLOAD_DIR)`; a mismatch throws `E009` and is logged.

---

## 14. Environment Setup

### 14.1 Required Installations

| Tool | Version | Required | Purpose |
|------|---------|----------|---------|
| Node.js | 20.11.1 LTS | Yes | Runtime and build |
| pnpm | 9.12.3 | Yes | Package management |
| ImageMagick | 7.1.1 | Yes | PSD, PSB, XCF, PUB, ODD, ODG, RAW fallback |
| LibRaw (`dcraw_emu`) | 0.21.4 | Yes | All 16 RAW camera formats |
| Ghostscript | 10.02.1 | Optional | EPS, PS, XPS only |

```bash
# ---- Node.js 20 LTS (nvm, recommended) ----
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20.11.1
nvm use 20.11.1
npm install -g pnpm@9.12.3

# ---- macOS (Homebrew) ----
brew install imagemagick libraw ghostscript
# Binaries land in /opt/homebrew/bin (Apple Silicon) or /usr/local/bin (Intel).
export IMAGEMAGICK_PATH="$(brew --prefix)/bin/magick"
export LIBRAW_PATH="$(brew --prefix)/bin/dcraw_emu"
export GHOSTSCRIPT_PATH="$(brew --prefix)/bin/gs"

# ---- Ubuntu / Debian (apt) ----
sudo apt-get update
sudo apt-get install -y imagemagick libraw-tools ghostscript imagemagick-6.q16
sudo update-alternatives --install /usr/bin/magick imagemagick-7 \
  /usr/bin/magick-im7.q16 1   # if dist ships IM6, promote IM7

# ---- Windows (winget) ----
winget install OpenJS.NodeJS.LTS
winget install pnpm.pnpm
winget install ImageMagick.ImageMagick
winget install ArtifexSoftware.GhostScript
# LibRaw has no winget package. Either build from source with vcpkg, or
# rely on the ImageMagick + dcraw_emu fallback documented in Section 18.

# ---- Windows (Chocolatey, alternative) ----
choco install nodejs-lts pnpm imagemagick ghostscript --yes

# ---- Arch (pacman) ----
sudo pacman -S nodejs-lts pnpm imagemagick libraw ghostscript

# ---- Verify ----
pnpm check-engines
```

### 14.2 Environment Variables

```bash
# .env.example  — copy to .env.local; do not commit .env.local
SERVER_MAX_FILE_SIZE_MB=50

IMAGEMAGICK_PATH=/usr/bin/magick
LIBRAW_PATH=/usr/bin/dcraw_emu
GHOSTSCRIPT_PATH=/usr/bin/gs
EXIFTOOL_PATH=/usr/bin/exiftool

TEMP_UPLOAD_DIR=/tmp/camerlob
NODE_ENV=development
```

`.env.example` is the authoritative list; this section and
`Documents/FOLDER-ARCHITECTURE.md` §11 mirror it exactly.

| Variable | Scope | Default | Notes |
|----------|-------|---------|-------|
| `SERVER_MAX_FILE_SIZE_MB` | Server | `50` | Per-file server ceiling; also the escalation threshold |
| `IMAGEMAGICK_PATH` | Server | `magick` | Falls back to `PATH` lookup when unset or blank |
| `LIBRAW_PATH` | Server | `dcraw_emu` | Falls back to `PATH` lookup when unset or blank |
| `GHOSTSCRIPT_PATH` | Server | `gs` | Falls back to `PATH` lookup when unset or blank; required only for EPS, PS and XPS |
| `EXIFTOOL_PATH` | Server | `exiftool` | Falls back to `PATH` lookup when unset or blank; optional metadata engine |
| `TEMP_UPLOAD_DIR` | Server | `os.tmpdir()/camerlob` | Must resolve outside the repository; created with `0700` |
| `NODE_ENV` | Server | `development` | Managed by Next.js; declared so the detection script and self-hosters see it |

Every variable above is read through `lib/constants/env.ts`, which is the only
module permitted to touch `process.env`. `NO_COLOR` is also read, by
`scripts/check-engines.ts` alone; it is a shell convention rather than
application configuration and is therefore commented out in `.env.example`.

No `NEXT_PUBLIC_*` variables exist in v1. `MAX_FILES`, `MAX_FILE_SIZE_MB`,
`MAX_BATCH_SIZE_MB`, `MAX_CONCURRENCY` and `ENGINE_TIMEOUT_MS` are exported
constants in `lib/constants/limits.ts`, and the product name and canonical URL
are literals in `lib/constants/site.ts` and `app/layout.tsx`. See
`Documents/FOLDER-ARCHITECTURE.md` §11.

### 14.3 Detection Script

`scripts/check-engines.ts` probes each binary by version, prints a status table, and exits non-zero when a required engine is missing, so it can gate CI.

```ts
// scripts/check-engines.ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, constants } from 'node:fs/promises';

const run = promisify(execFile);

interface Probe {
  name: string;
  path: string;
  versionArgs: string[];
  required: boolean;
  expected: string;
}

const PROBES: Probe[] = [
  { name: 'ImageMagick', path: process.env.IMAGEMAGICK_PATH ?? 'magick',
    versionArgs: ['-version'], required: true, expected: '7.x' },
  { name: 'LibRaw',      path: process.env.LIBRAW_PATH ?? 'dcraw_emu',
    versionArgs: ['-v'], required: true, expected: '0.21.x' },
  { name: 'Ghostscript', path: process.env.GHOSTSCRIPT_PATH ?? 'gs',
    versionArgs: ['--version'], required: false, expected: '10.x' },
];

let failures = 0;

for (const probe of PROBES) {
  process.stdout.write(`Checking ${probe.name}… `);
  try {
    await access(probe.path, constants.X_OK).catch(async () => {
      // Not an absolute path: rely on PATH resolution via execFile.
    });
    const { stdout, stderr } = await run(probe.path, probe.versionArgs, { timeout: 5000 });
    const banner = `${stdout}${stderr}`.split('\n')[0].trim();
    console.log(`OK  ${probe.path}`);
    console.log(`      ${banner}`);
  } catch {
    if (probe.required) { failures++; console.log('MISSING (required)'); }
    else { console.log('MISSING (optional — EPS/PS/XPS only)'); }
  }
}

console.log('');
if (failures > 0) {
  console.error(`${failures} required engine(s) unavailable. Server-side formats will fail.`);
  console.error('See Documents/TRD.md Section 14.1 for install instructions.');
  process.exit(1);
}
console.log('All required engines present.');
```

Expected output on a fully provisioned machine:

```text
Checking ImageMagick… OK  /usr/bin/magick
      Version: ImageMagick 7.1.1-43 Q16-HDRI x86_64
Checking LibRaw… OK  /usr/bin/dcraw_emu
      LibRaw 0.21.4
Checking Ghostscript… OK  /usr/bin/gs
      GPL Ghostscript 10.02.1 (2023-09-18)

All required engines present.
```

---

## 15. Testing Strategy

| Layer | Tool | Scope | Gate |
|-------|------|-------|------|
| Unit | `vitest@1.6.1` | Matrix integrity, router branches, sanitiser, formatters | `pnpm run test` |
| Component | `vitest` + `@testing-library/react@16.0.1` | FormatPicker filtering, useFileQueue cap, FileCard states | `pnpm run test` |
| Integration | `vitest` | Route handlers against real fixture files, one per engine | `pnpm run test:integration` |
| E2E | `@playwright/test@1.45.3` | Landing → convert → result → ZIP download | `pnpm run test:e2e` |
| Manual | Checklist | One file per supported format, 40+ formats | Pre-release gate for Metric 1 in `Documents/PRD.md` Section 13 |

**Coverage expectations.** 100% branch coverage on `lib/convert/router.ts`, `lib/utils/sanitize-filename.ts`, and `lib/constants/formats.config.ts`. 90% lines elsewhere in `lib/`. No coverage threshold on React components beyond the three named above.

**Manual test matrix.** The release gate for `Documents/PRD.md` Success Metric 1 is a spreadsheet with one row per format, columns `Format | Fixture | Target | Engine | Result | Duration | Notes`. Every one of the 40+ formats must show a successful conversion. Fixtures live in `tests/fixtures/`; RAW fixtures are 2–5MB crops from public-domain sample images, not full-size camera files, to keep the repository small.

```ts
// tests/unit/matrix.test.ts
import { describe, it, expect } from 'vitest';
import { CONVERSION_MATRIX } from '@/lib/constants/formats.config';
import { FORMATS } from '@/lib/constants/formats.config';

describe('conversion matrix integrity', () => {
  it('covers all 40+ supported source formats', () => {
    expect(Object.keys(CONVERSION_MATRIX).length).toBeGreaterThanOrEqual(40);
    expect(Object.keys(CONVERSION_MATRIX).sort())
      .toEqual(FORMATS.map((f) => f.format).sort());
  });

  it('never offers a layered, vector, or RAW format as a target', () => {
    const sourceOnly = new Set(
      FORMATS.filter((f) => f.sourceOnly || f.exportOnly).map((f) => f.format),
    );
    for (const [source, entry] of Object.entries(CONVERSION_MATRIX)) {
      for (const target of entry.targets) {
        expect(sourceOnly.has(target as never), `${source} → ${target} is illegal`).toBe(false);
      }
    }
  });

  it('declares every one-way entry with a reason', () => {
    for (const entry of Object.values(CONVERSION_MATRIX)) {
      if ('oneWay' in entry && entry.oneWay) {
        expect(entry.reason).toBeTruthy();
      }
    }
  });
});
```

```ts
// tests/unit/router.test.ts
import { describe, it, expect } from 'vitest';
import { routeConversion } from '@/lib/convert/router';

const HEALTH_ALL = { client: true, sharp: true, imagemagick: true, libraw: true, ghostscript: true };
const HEALTH_NONE = { client: true, sharp: false, imagemagick: false, libraw: false, ghostscript: false };

describe('routeConversion', () => {
  it('routes JPG → WEBP to the client engine', () => {
    expect(routeConversion('jpg', 'webp', HEALTH_ALL)).toBe('CLIENT_WASM');
  });

  it('routes CR2 → JPG to LibRaw regardless of health', () => {
    expect(routeConversion('cr2', 'jpg', HEALTH_ALL)).toBe('SERVER_LIBRAW');
  });

  it('throws E006 when the required engine is absent', () => {
    expect(() => routeConversion('cr2', 'jpg', HEALTH_NONE)).toThrow(/E006|E006/);
  });

  it('throws E001 for a pair absent from the matrix', () => {
    expect(() => routeConversion('psd', 'cr2', HEALTH_ALL)).toThrow();
  });
});
```

```ts
// tests/unit/sanitize-filename.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '@/lib/utils/sanitize-filename';

describe('sanitizeFilename', () => {
  it('strips directory traversal', () => {
    expect(sanitizeFilename('../../etc/passwd.jpg')).toBe('passwd.jpg');
  });

  it('removes Windows-reserved characters', () => {
    expect(sanitizeFilename('IMG<1>:2|C.RAW')).toBe('IMG12C.RAW');
  });

  it('renames reserved device names', () => {
    expect(sanitizeFilename('CON.png')).toBe('_CON.png');
  });

  it('preserves unicode letters', () => {
    expect(sanitizeFilename('写真_2024.JPG')).toBe('写真_2024.JPG');
  });

  it('truncates the stem to 180 characters', () => {
    expect(sanitizeFilename(`${'a'.repeat(300)}.png`)).toHaveLength(184);
  });
});
```

**E2E flow under test** (`tests/e2e/convert-flow.spec.ts`): load `/`, assert the hero CTA, click through to `/convert`, select `JPG` and `WEBP`, attach `tests/fixtures/sample.jpg` via `setInputFiles`, assert the counter reads `1 / 20 FILES`, click Convert, wait for `/result`, assert the "1 of 1 converted" header, and assert the ZIP download resolves to a file larger than zero bytes.

---

## 16. Build & Deployment

### 16.1 Local Development

```bash
pnpm install
pnpm check-engines        # exits 1 if a required engine is missing
cp .env.example .env.local
pnpm run dev                  # http://localhost:3000
```

### 16.2 Production Build (Local)

```bash
pnpm run build
pnpm run start                # http://localhost:3000, full format support
```

Local production mode is the recommended way to demo the complete format matrix, because the dev server adds compilation latency that makes the 2-second client-side target unmeasurable.

### 16.3 Vercel Deployment (Limited)

```json
// vercel.json
{
  "framework": "nextjs",
  "functions": {
    "app/api/convert/route.ts": { "maxDuration": 10, "memory": 1024 },
    "app/api/health/route.ts":  { "maxDuration": 10 }
  },
  "buildCommand": "pnpm run build"
}
```

Behaviour on Vercel:

- Client-side formats convert normally; no server route is invoked.
- `GET /api/health` returns `status: "degraded"` with all server engines `false`, because no native binary is reachable from a serverless function.
- The format picker hides every RAW, PSD, PSB, XCF, EPS, PS, XPS, PUB, ODD, and ODG source format.
- A direct `POST /api/convert` returns `E006` with the message directing the user to run locally.
- Requests above the 4.5MB body limit are rejected by the platform with `413`; the app's own `E002` fires first for anything over 50MB.
- `README.md` and the in-app footer state the localhost requirement for the full format list.

### 16.4 Docker (Optional, Future)

```dockerfile
# Dockerfile — optional distribution for users who prefer a container
FROM node:20.11.1-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
# Rebuild the native sharp binding for the target libc
RUN pnpm rebuild sharp

FROM base AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      imagemagick libraw-tools ghostscript tini \
 && rm -rf /var/lib/apt/lists/*
ENV IMAGEMAGICK_PATH=/usr/bin/magick \
    LIBRAW_PATH=/usr/bin/dcraw_emu \
    GHOSTSCRIPT_PATH=/usr/bin/gs \
    TEMP_UPLOAD_DIR=/tmp/camerlob
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
RUN mkdir -p /tmp/camerlob && chmod 0700 /tmp/camerlob
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "run", "start"]
```

```bash
docker build -t camerlob:1.0.0 .
docker run --rm -p 3000:3000 camerlob:1.0.0
```

---

## 17. Dependencies (`package.json`)

```json
{
  "name": "camerlob",
  "version": "1.0.0",
  "private": true,
  "license": "MIT",
  "description": "Local-first, unlimited, free image format converter.",
  "engines": {
    "node": ">=20.11.1 <21"
  },
  "packageManager": "pnpm@9.12.3",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint --dir app --dir components --dir lib --dir hooks --dir store",
    "format": "prettier --write \"**/*.{ts,tsx,css,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,css,json,md}\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "check-engines": "tsx scripts/check-engines.ts",
    "verify": "pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test"
  },
  "dependencies": {
    "browser-image-compression": "2.0.2",
    "file-saver": "2.0.5",
    "fluent-ffmpeg": "2.1.3",
    "framer-motion": "11.0.28",
    "heic2any": "0.0.4",
    "jszip": "3.10.1",
    "lucide-react": "0.400.0",
    "next": "14.2.35",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-dropzone": "14.3.5",
    "react-hook-form": "7.52.2",
    "sharp": "0.33.5",
    "sonner": "1.5.0",
    "zod": "3.23.8",
    "zustand": "4.5.7"
  },
  "devDependencies": {
    "@playwright/test": "1.45.3",
    "@testing-library/jest-dom": "6.4.8",
    "@testing-library/react": "16.0.1",
    "@testing-library/user-event": "14.5.2",
    "@types/node": "22.9.0",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "@vitejs/plugin-react": "4.3.3",
    "@vitest/coverage-v8": "1.6.1",
    "autoprefixer": "10.4.20",
    "eslint": "9.12.0",
    "eslint-config-next": "14.2.35",
    "jsdom": "25.0.1",
    "postcss": "8.4.47",
    "prettier": "3.3.3",
    "prettier-plugin-tailwindcss": "0.6.8",
    "tailwindcss": "3.4.19",
    "tsx": "4.19.1",
    "typescript": "5.4.5",
    "vitest": "1.6.1"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["sharp", "esbuild"]
  }
}
```

**Notes on dependency selection.**

- `magick-wasm@0.0.3` is intentionally absent from `dependencies`. It is an optional client engine loaded at runtime from `/public/wasm/` (see Section 19 of `Documents/UI-UX-BRIEF.md`) so its multi-megabyte payload never enters the initial bundle. Add it to `optionalDependencies` if the team prefers npm resolution over a vendored asset.
- `fluent-ffmpeg@2.1.3` is installed for dependency parity with the future roadmap only. It is **not imported anywhere in v1**; there is no video conversion, consistent with the PRD non-goals. Remove it if a dependency audit flags an unused package.
- `react-hook-form@7.52.2` has a deliberately small surface: only the format search field uses it. File selection is imperative, not form-driven.
- `sharp@0.33.5` ships prebuilt binaries for macOS, Linux, and Windows x64 and arm64, so no `node-gyp` toolchain is required on any supported platform.

---

## 18. Risks & Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| 1 | ImageMagick not installed on the user's machine | High — all PSD, PSB, XCF, PUB, ODD, ODG and RAW-fallback conversion fails | High | `scripts/check-engines.ts` gates `pnpm run dev`; `E006` names the missing binary and the exact command to install it; the format picker marks those sources `LOCAL ONLY`; README shows per-OS install steps |
| 2 | Browser lacks WebAssembly or a required codec | High — client engine unavailable for TIFF, TGA, PPM, ICO, HEIC | Medium | Feature-detect `WebAssembly.instantiate` and `HTMLCanvasElement.prototype.toBlob` support for each target at startup; when the client engine is unavailable the router escalates straight to the server engine, so functionality is preserved |
| 3 | Large RAW files crash the browser with `E008` | High — perceived as a broken app | Low | RAW is never routed client-side; `MAX_FILE_SIZE_MB` (100) rejects oversized inputs before decode; concurrency capped at 3; `canvas.width = 0` release after encode; object URLs revoked on removal |
| 4 | Vercel's 4.5MB payload limit rejects large uploads | Medium — cloud users cannot convert large files | High | `E002` fires locally before any upload attempt; health probe hides server formats on Vercel; every surface states the localhost requirement; `vercel.json` declares the limit explicitly so failures are predictable |
| 5 | Ghostscript AGPL licence complicates distribution | Medium — blocks bundling in the optional Docker image or a future binary release | Medium | Ghostscript is never bundled or redistributed; it is invoked as an external binary the user installs, and the Dockerfile installs it from the distro repository. It is only required for EPS, PS, and XPS, so a user who never touches vector formats is unaffected |
| 6 | 20-file limit causes user frustration mid-batch | Medium — the PRD's hardest limit | High | Live `X / 20 FILES` counter at all times; the 21st file is rejected with an `E003` toast naming the limit; the dropzone hint repeats "up to 20 files"; the limit is documented on the landing page features strip |
| 7 | LibRaw `dcraw_emu` absent or built without camera support | High — all 16 RAW formats fail | Medium | Health probe reports it separately; ImageMagick with its `dcraw` delegate acts as a documented fallback; `E006` message names the specific binary to install |
| 8 | `sharp` native binding fails to install | High — server engine entirely unavailable | Low | `pnpm.onlyBuiltDependencies` allowlists `sharp`; prebuilt binaries cover all supported platforms; `pnpm rebuild sharp` documented in the troubleshooting section of the README |
| 9 | Base64 response inflates payload ~33%, exceeding Vercel's limit before the 50MB check | Medium — confusing 413 with no explanation | Low | Server cap of 50MB applied before encoding; the Vercel-specific README section documents the effective ceiling; `vercel.json` declares `maxDuration` so timeouts are distinguishable from size rejections |
| 10 | Temp directory fills or is left behind after a crash | Low — disk pressure on the user's machine | Low | `finally`-block cleanup per job plus a 1-hour sweeper in `instrumentation.ts`; job directories created under `0700`; temp root is OS-managed temp space |
| 11 | Node 22 or 24 in the user's environment breaks the `sharp` or `child_process` surface | Medium — project refuses to run | Medium | `engines` field pins `>=20.11.1 <21`; `packageManager` field pins pnpm; a startup check in `instrumentation.ts` warns loudly on an unsupported major version |
| 12 | Browser tab becomes unresponsive during a 20-file batch | Medium — feels broken despite working | Medium | Concurrency semaphore at 3; per-file progress updates via `requestAnimationFrame` batching; `magick-wasm` off the main path; `E008` surfaced as a clear toast rather than a silent stall |

---

## 19. Future Technical Roadmap (Out of Scope for v1)

| Release | Item | Technical Approach | Dependency Added |
|---------|------|--------------------|------------------|
| v1.1 | Watch folder daemon | Node daemon using `chokidar@3.6.0`, reusing `lib/convert/server-converter.ts` unchanged; reads the matrix from `formats.config.ts`; no web surface | `chokidar` |
| v1.2 | CLI tool | `commander@12.1.0` entry point; converts `File`-shaped inputs through the same server converter; emits to an output directory rather than a temp dir; shares all of `lib/` unchanged | `commander` |
| v1.3 | Desktop packaging | `tauri@1.6.0` preferred over Electron for binary size; wraps the same Next.js standalone output and bundles the native binaries; light mode and dark mode follow the OS | `tauri` |
| v1.4 | Parallel conversion | `worker_threads` pool with a queue depth of `Math.min(cpus().length - 1, 8)`; requires refactoring `server-converter.ts` to be worker-safe and stateless | none |
| v2.0 | Conversion history sync | Opt-in Supabase project; store receives metadata only (filename, size, format pair, duration) with a size cap and a hard opt-in flag; no image bytes leave the machine even with sync enabled | `@supabase/supabase-js` |
| v2.1 | Public REST API | Token-based auth over the existing route handlers; a `rate_limit` extension point; a public-key-only key store; documented as a separate product with its own privacy posture | `jose` |

None of these items may alter v1 behaviour. The architectural decision that protects them is that `lib/convert/` has no dependency on Next.js — it takes `File` and returns `Blob`, so a CLI or daemon can import it with no web layer at all.

---

## 20. Glossary

| Term | Definition |
|------|------------|
| **WASM** (WebAssembly) | A portable binary instruction format that lets compiled C and C++ libraries, such as an ImageMagick build, execute inside a browser sandbox. Used here by `magick-wasm` for TIFF, TGA, PPM, and PSD decoding without a server. |
| **HEIC** (High Efficiency Image Container) | The default still-image format on iPhones, based on HEVC. No mainstream browser can decode it natively, which is why `heic2any` is a hard dependency. |
| **AVIF** (AV1 Image File Format) | A modern, highly compressed image format built on the AV1 video codec. Supported for encoding by Safari and recent Chrome and Firefox; feature-detected before use. |
| **RAW** | Unprocessed camera sensor data containing substantially more tonal and colour information than a compressed image. Requires a dedicated decoder that performs demosaicing, so it is a decode-only family. |
| **LibRaw** | A C library wrapping `dcraw` that decodes camera RAW files and outputs a demosaiced image. Camerlob invokes its `dcraw_emu` front-end, which is LibRaw 0.21.4. |
| **ImageMagick** | A command-line image processing suite supporting several hundred formats. Invoked by Camerlob as an external binary to handle PSD, PSB, XCF, and publication formats. |
| **Ghostscript** | An interpreter for PostScript and PDF, licensed under the AGPL. Installed separately and used only to rasterise EPS, PS, and XPS. |
| **sharp** | A Node library wrapping libvips. Fast, memory-efficient image encoding and decoding for the common raster formats, with prebuilt binaries for all supported platforms. |
| **EXIF** (Exchangeable Image File Format) | Embedded metadata such as camera model, exposure, and orientation. Preserved through the sharp pipeline via `.rotate()`, which applies the orientation tag to pixels rather than stripping it. |
| **MIME** (Multipurpose Internet Mail Extensions) | The media type string identifying a file's format, such as `image/jpeg`. Treated as a hint in Camerlob; the extension and magic bytes are authoritative. |
| **Magic bytes** | The leading byte sequence that identifies a file's real format regardless of its extension, for example `FF D8 FF` for JPEG. Used in `lib/utils/magic-bytes.ts` to catch mislabelled files before decode. |
| **Client-side conversion** | Conversion performed entirely in the browser. No image data leaves the device, no server is involved, and the conversion is Vercel-compatible. |
| **Server-side conversion** | Conversion performed by `sharp`, ImageMagick, LibRaw, or Ghostscript on the local Next.js server. Required for RAW, layered, and vector formats; localhost only. |
| **App Router** | The Next.js 14 routing and rendering model built on the `app/` directory, using React Server Components, layouts, and route handlers. Replaces the legacy Pages Router. |
| **Server Actions** | Next.js functions invoked directly from server-rendered forms to mutate server state. **Deliberately unused in Camerlob** — conversion is a binary-payload operation, not a form mutation, and `POST /api/convert` is the correct primitive. |
| **shadcn/ui** | A distribution model for accessible React component source, copied into the project rather than installed as a dependency. Camerlob holds the copies in `components/ui/` and restyles them with Deep Aqua tokens. |
| **Skip-and-continue** | The batch resilience policy from `Documents/PRD.md` Section 8: one failed file produces an entry in `failed[]` while the remaining files still convert and the response is still `200`. |
| **Escalation** | The one-directional fallback from the client engine to the server engine after a client failure, permitted once per file and only for codes E004, E005, E007, E008, and E009. |
| **Sanitisation** | Rewriting a user-supplied filename to remove path separators, control characters, and reserved names before it reaches the filesystem, a ZIP entry, or an HTTP header. |

---

## 21. Appendix

### 21.1 Related Documents

- [`Documents/PRD.md`](./PRD.md) — Product Requirements Document v1.0. The source of truth for scope. This TRD implements it and adds no product features. Section cross-references such as "PRD Section 8" point to that document.
- [`Documents/UI-UX-BRIEF.md`](./UI-UX-BRIEF.md) — UI/UX Design Brief v1.0, the Deep Aqua design system. Supplies every colour, token, spacing value, motion curve, and component state referenced throughout this document.

### 21.2 Cross-Reference Matrix

| Requirement Source | Implemented In |
|--------------------|----------------|
| PRD 5.1 Landing page | `app/(marketing)/page.tsx` |
| PRD 5.2 Converter page | `app/convert/page.tsx`, `components/camerlob/FormatPicker.tsx`, `UploadZone.tsx`, `FileQueue.tsx` |
| PRD 5.3 Result page | `app/result/page.tsx`, `components/camerlob/ResultSummary.tsx`, `ResultCard.tsx`, `FailedFiles.tsx` |
| PRD 6 Supported formats | `lib/constants/formats.config.ts` |
| PRD 7 Two-way matrix | `lib/constants/formats.config.ts` + `tests/unit/matrix.test.ts` |
| PRD 8 Non-functional requirements | `Documents/TRD.md` Sections 12 and 15 |
| PRD 9 Technical architecture | `Documents/TRD.md` Sections 4 and 9 |
| PRD 10 User flows | `tests/e2e/convert-flow.spec.ts` |
| PRD 12 Constraints | `lib/constants/limits.ts`, Section 16.3 |
| PRD 13 Success metrics | `tests/integration/`, `tests/fixtures/` matrix |
| UI-UX Brief 3 Colour system | `styles/tokens.css` |
| UI-UX Brief 8 Components | `components/ui/`, `components/camerlob/` |
| UI-UX Brief 9 Motion | `styles/globals.css` reduced-motion block |
| UI-UX Brief 16 Tokens | `styles/tokens.css`, `tailwind.config.ts` |
| UI-UX Brief 19 Assets | `public/` |

### 21.3 Version History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | YYYY-MM-DD | YYYY | Initial TRD for the Camerlob MVP |

### 21.4 Open Questions for Future Review

1. **`magick-wasm@0.0.3` is pre-1.0 and its last publish predates the current Next.js release line.** Decision needed on whether to vendor the `.wasm` asset, pin the npm package, or replace it with a `wasm-imagemagick` fork. This is the only unversioned-0.x dependency in the client path.
2. **AVIF encoding in Canvas is Chromium-only for now.** Should AVIF targets fall back to WEBP with a disclosure toast, or should AVIF be routed to `sharp` on the server where encoding support is unconditional? The current design picks the former.
3. **Animated GIF handling defaults to first-frame flattening.** Confirm this matches user expectation, or promote a `gif.js` pipeline into v1. The PRD does not specify multi-frame output either way.
4. **LibRaw `-h` half-size develop is the current speed optimisation.** Confirm whether full-resolution RAW output is required for v1, since it materially changes the 10-second budget in PRD Section 8.
5. **X3F (Sigma) and 3FR (Hasselblad) coverage in `dcraw_emu` 0.21.4** is uneven across builds. Verify against the manual test matrix before committing to Success Metric 1 in PRD Section 13, and document any format that only converts through the ImageMagick fallback.
6. **Whether `fluent-ffmpeg@2.1.3` should ship at all**, given no video feature exists in v1. Keeping it costs install time and audit surface for no benefit.
7. **`INSTANT` threshold for the `E003` toast versus a brief grace period** — the current design rejects the 21st file immediately, but a 300ms debounce before rejecting would better match drop-zone behaviour when a user drags a 25-file folder in one gesture.

---

*End of document.*
