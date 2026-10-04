# Camerlob — Folder & File Architecture

## 1. Document Metadata

| Field | Value |
|---|---|
| **Project** | Camerlob — local-first image format converter |
| **Document** | Folder & File Architecture (repository layout specification) |
| **Version** | 1.0.0 |
| **Target release** | v1.0.0 |
| **Author** | `_replace with maintainer handle_` |
| **Reviewers** | `_replace with reviewer handles_` |
| **Date** | `_YYYY-MM-DD_` |
| **Status** | Draft — awaiting approval |
| **Applies to** | Next.js 14.2.x App Router, TypeScript 5.4.x strict, pnpm 9.x |

**Source of truth references.** This document is subordinate to three upstream documents and must not contradict them:

- `Documents/PRD.md` — product scope, supported formats, limits, non-goals.
- `Documents/UI-UX-BRIEF.md` — Deep Aqua design system, component library, design assets.
- `Documents/TRD.md` — technical architecture, conversion matrix, API contracts, environment variables.

Where this document and `Documents/TRD.md` §5 disagree on a **file name**, this document is normative for the repository and the difference is recorded in §4.16. Where they disagree on **behaviour**, `Documents/TRD.md` wins.

---

## 2. Architecture Philosophy

Six principles dictate every folder and file decision in this repository. A pull request that violates one of them should be sent back rather than merged and cleaned up later.

### 2.1 Feature-first, not type-first

Components are grouped by the feature they serve, not by technical kind. `FormatPicker`, `UploadZone` and `ResultGrid` all live under `components/camerlob/` because a contributor changing format-picker behaviour reads one folder, not three scattered ones. The single exception is `components/ui/`, which holds vendored shadcn/ui primitives that are restyled wholesale and never contain product logic. A new feature therefore arrives as a coherent, reviewable slice.

### 2.2 The server/client boundary is explicit

Anything touching `sharp`, `child_process`, `fs` or a WASM binary lives in `lib/convert/server-converter.ts` and is reached only from `app/api/**/route.ts`. Anything touching `canvas`, `heic2any` or `FileReader` lives in `lib/convert/client-converter.ts`. The two never import each other; they meet only at `lib/convert/router.ts`, which is pure and framework-free. This is the most load-bearing rule in the repository, because it is what keeps `lib/convert/` reusable from a CLI, a daemon or a desktop shell without dragging Next.js along.

### 2.3 The conversion engine is pluggable and swappable

No engine is named outside `lib/convert/engines/`. `sharp`, ImageMagick, LibRaw and Ghostscript each get one file with a uniform signature — take a `File`, return a `Blob`, throw a typed error. Adding or replacing an engine is a file addition plus one line in the router registry, never a refactor of calling code. The same discipline applies to formats: `lib/constants/formats.ts` is the only place a format identifier may be written down.

### 2.4 Docs live next to code

`Documents/` sits at the repository root, not in a wiki or a `docs/` site folder, so the PRD, design brief, technical requirements and this document travel in the same commit, reviewed by the same people. A change to a conversion limit is a diff against `Documents/TRD.md` and `lib/constants/limits.ts` in one pull request. Documentation is versioned, diffable and greppable — never a separate destination.

### 2.5 Zero-config for contributors

One command runs the app: `pnpm install && pnpm run dev`. One command verifies everything: `pnpm run verify`. One command diagnoses the most common setup failure: `pnpm check-engines`. No manual step may be required beyond installing the native binaries that the detection script names explicitly. If setup needs a wiki page, the structure is wrong.

### 2.6 GitHub-ready from day one

`.github/`, `.husky/`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md` and the CI workflows exist in the first commit, not in a pre-launch scramble. Templates, funding metadata and Dependabot are configured before the first external contributor arrives, because retrofitting a welcome path is how projects lose contributors. The repository is a published artefact, not a private scratchpad with a licence added later.

---

## 3. Top-Level Repository Structure

```text
Camerlob/
├── .github/                  # Issues, PRs, Actions, funding, Dependabot
├── .husky/                   # Git hooks: lint-staged, commitlint, pre-push tests
├── .vscode/                  # Recommended editor settings, extensions, debug config
├── app/                      # Next.js App Router: pages, layouts, API routes, SEO files
├── components/
│   ├── ui/                   # Vendored shadcn/ui primitives, restyled with Deep Aqua tokens
│   ├── camerlob/             # Camerlob feature components (the product surface)
│   └── icons/                # Custom SVG icon components not available in lucide-react
├── hooks/                    # Custom React hooks (stateful behaviour, no rendering)
├── lib/
│   ├── convert/              # Framework-free conversion core (client, server, router, engines)
│   ├── utils/                # Framework-agnostic helpers (formatting, MIME, filenames, zip)
│   └── constants/            # Single source of truth: formats, limits, errors, copy
├── types/                    # TypeScript types only — no runtime code permitted
├── store/                    # Zustand stores for cross-component client state
├── public/                   # Static assets served verbatim; WASM payloads for magick-wasm
├── styles/                   # Design tokens, global CSS, keyframes, scrollbar
├── scripts/                  # Repo tooling: engine detection, installers, asset generation
├── tests/                    # Vitest unit + integration, Playwright e2e, binary fixtures
├── Documents/                # PRD, UI-UX brief, TRD, this architecture document
├── node_modules/             # Installed dependencies (gitignored)
├── .next/                    # Next.js build output and dev cache (gitignored)
├── out/                      # Static export output, if produced (gitignored)
└── <root configuration files> # See §4.1 — package.json, tsconfig.json, CI-adjacent dotfiles
```

Two directories are deliberately absent. There is no `pages/` directory, because App Router routing replaces it. There is no `docs/` directory, because `Documents/` is the documentation home and a second one would immediately diverge.

---

## 4. Full File Tree (Exhaustive)

NOTE: The tree below is the target v1.0.0 layout. Some paths are not yet present in the repository at the time of writing; where that is the case the path is marked "(planned)". STRUCTURE.txt is generated from the real disk and is authoritative for what currently exists.

The comment after `#` states the single responsibility of that file; if a file needs two sentences, it is doing too much.

### 4.1 Root-level files

```text
Camerlob/
├── .gitignore                  # Dependencies, build output, secrets, OS/IDE noise, temp dirs
├── .gitattributes              # LF line endings; images, .wasm and .ico marked binary
├── .editorconfig               # UTF-8, LF, two-space indent, final newline in every editor
├── .env.example                # Committed template of every environment variable
├── .env.local                  # Local overrides; gitignored, copied from .env.example
├── .eslintrc.json              # ESLint config: next/core-web-vitals plus strict TS rules
├── .eslintignore               # Excludes build output and generated assets from linting
├── .prettierrc                 # 100 print width, single quotes, trailing commas, import order
├── .prettierignore             # Excludes lockfiles, fixtures and generated icons from formatting
├── .nvmrc                      # Pins Node 20.11.1 LTS for contributors and CI runners
├── LICENSE                     # MIT licence text
├── README.md                   # Front door: hero, badges, install, usage, format table, licence
├── CHANGELOG.md                # Keep a Changelog log of every user-visible release
├── CONTRIBUTING.md             # Fork, branch, commit, test and PR workflow plus style rules
├── CODE_OF_CONDUCT.md          # Contributor Covenant v2.1 with enforcement contacts
├── SECURITY.md                 # Private responsible-disclosure channel and version policy
├── package.json                # Scripts, engines, packageManager and pinned dependencies
├── pnpm-lock.yaml              # Exact resolved dependency graph, committed for reproducibility
├── tsconfig.json               # TypeScript 5.4 strict mode and the @/* path aliases
├── next.config.mjs             # CSP headers, WASM MIME types, body size limit, image config
├── tailwind.config.ts          # Maps Deep Aqua CSS custom properties to Tailwind utilities
├── postcss.config.mjs          # PostCSS pipeline: Tailwind and Autoprefixer only
├── components.json             # shadcn/ui CLI config: style, base colour, aliases, icon library
├── vitest.config.ts            # Unit/integration environment, setup file, coverage thresholds
├── playwright.config.ts        # E2E projects, base URL, web server, trace and screenshot policy
├── vercel.json                 # 4.5 MB body limit, function maxDuration, build settings
├── Dockerfile                  # Optional Node 20 image with ImageMagick, LibRaw, Ghostscript
├── docker-compose.yml          # Local single-service compose file matching the Dockerfile
└── .dockerignore               # Keeps the build context small: no node_modules, .next, secrets
```

### 4.2 `.github/`

```text
.github/
├── workflows/
│   ├── ci.yml                  # Lint, format, typecheck, unit, integration, build, E2E
│   ├── release.yml             # Tag-triggered build, GitHub Release, artefact upload
│   └── codeql.yml              # CodeQL security scanning on push and schedule
├── ISSUE_TEMPLATE/
│   ├── bug_report.md           # Format pair, OS, browser, engine status, reproduction steps
│   ├── feature_request.md      # Structured request form tied to the PRD roadmap
│   └── config.yml              # Blank-issue policy, contact links, template chooser
├── PULL_REQUEST_TEMPLATE.md    # Tests, strict types, a11y, reduced motion, CHANGELOG, screenshot
├── FUNDING.yml                 # Sponsor and funding platform metadata
└── dependabot.yml              # Weekly grouped pnpm and GitHub Actions updates
```

### 4.3 `.vscode/`

```text
.vscode/
├── settings.json               # Recommended editor settings: format on save, strict TS
├── extensions.json             # Recommended extensions: ESLint, Prettier, Tailwind, Playwright
└── launch.json                 # Debug configs for the Next.js server, client and E2E runs
```

### 4.4 `.husky/`

```text
.husky/
├── pre-commit                  # Runs lint-staged over staged TS, CSS, JSON and Markdown
├── commit-msg                  # Runs commitlint to enforce Conventional Commits
└── pre-push                    # Runs typecheck, lint and the unit suite before pushing
```

### 4.5 `app/` — Next.js App Router

```text
app/
├── layout.tsx                  # Root layout: HTML shell, fonts, metadata, providers, nav, footer
├── globals.css                 # Global entry: imports styles/tokens.css, Tailwind layers, resets
├── not-found.tsx               # 404 page matching the Deep Aqua visual language
├── error.tsx                   # Route error boundary with retry and reset actions
├── loading.tsx                 # Global loading UI for route transitions and suspense
├── instrumentation.ts          # Node startup: version check, temp dir creation, stale sweeper (planned)
├── favicon.ico                 # App-directory favicon: aperture glyph on near-black (planned)
├── robots.ts                   # robots.txt metadata route: allow all, declare sitemap (planned)
├── sitemap.ts                  # sitemap.ts metadata route: landing, convert and result entries (planned)
├── manifest.ts                 # Web app manifest metadata route: name, icons, theme colour (planned)
├── opengraph-image.tsx         # Generates the 1200x630 OG image from the aqua gradient tokens (planned)
├── (shell)/                    # Route group holding the three rendered product routes
│   ├── layout.tsx              # Shell chrome shared by every page in the group
│   ├── page.tsx                # Landing route for /: seven sections, one column of intent
│   ├── convert/
│   │   ├── page.tsx            # Format pickers, upload zone, file queue, convert action
│   │   └── loading.tsx         # Skeleton loader matching the converter layout
│   └── result/
│       ├── page.tsx            # Summary, per-file downloads, ZIP download, failure list
│       └── loading.tsx         # Skeleton loader matching the result layout
└── api/
    ├── health/
    │   └── route.ts            # GET /api/health: engine availability and Node version probe
    ├── formats/
    │   ├── route.ts            # GET /api/formats: serialised conversion matrix
    │   └── [format]/
    │       └── route.ts        # GET /api/formats/[format]: one format's capability record
    └── convert/
        └── route.ts            # POST /api/convert: server conversion with size and format guards
```

Deviation from the target layout: the landing, convert and result routes live inside the `(shell)` route group rather than at the top level of `app/`, and `app/page.tsx` does not exist — `/` is served by `app/(shell)/page.tsx`. The per-route `layout.tsx` files planned for `convert/` and `result/` are superseded by the single `(shell)/layout.tsx` for now.

### 4.6 `components/`

`components/ui/` holds vendored shadcn/ui primitives restyled with Deep Aqua tokens. Product logic is forbidden here; the files are owned by the shadcn CLI.

```text
components/ui/
├── button.tsx                  # Primary, ghost, text, danger and icon variants with focus glow
├── input.tsx                   # Text input with aqua focus ring and error state (planned)
├── select.tsx                  # Searchable select primitive for the target format picker (planned)
├── dialog.tsx                  # Modal with blur(8px) backdrop, confirmation use only (planned)
├── progress.tsx                # Determinate track and indeterminate shimmer (planned)
├── badge.tsx                   # Six variants at 15% alpha for engine and format labels (planned)
├── tooltip.tsx                 # 100ms fade with a 400ms hover delay (planned)
├── sonner.tsx                  # Toaster wired to theme tokens, stacked bottom-right (planned)
├── skeleton.tsx                # Loading placeholder block used by route loading.tsx files (planned)
├── separator.tsx               # Horizontal rule between form sections (planned)
├── scroll-area.tsx             # Custom scroll container for the long format grid (planned)
├── label.tsx                   # Accessible form label bound to controls by id (planned)
└── card.tsx                    # Surface container for format, file and result cards (planned)
```

```text
components/camerlob/
├── AnimatedBackground.tsx      # Fixed full-bleed aperture/gradient field behind the shell
├── ApertureVisual.tsx          # Aperture glyph rendered as animated SVG for the hero
├── ConvertActionBar.tsx        # Sticky action row: convert, clear, and running-state controls
├── EmptyState.tsx              # Placeholder when no files are queued or no results exist
├── EngineStatusPanel.tsx       # Engine availability readout fed by useEngineStatus
├── FailedFilesList.tsx         # Red-bordered list of failed files with their error reasons
├── FileCard.tsx                # Thumbnail, name, size, progress and remove control per file
├── FileCounter.tsx             # Counter badge showing used slots against the batch limit
├── FileQueue.tsx               # Ordered list of accepted files with the X / 20 FILES counter
├── Footer.tsx                  # Three-column footer: brand, product links, social row, legal line
├── FormatCard.tsx              # Single format card: default, hover, selected, disabled
├── FormatGrid.tsx              # Section 04 format matrix grid on the landing page
├── FormatPicker.tsx            # Source and target format selection driven by the format registry
├── FormatSwapButton.tsx        # Swaps source and target formats in the picker
├── HeroCTA.tsx                 # Primary hero call to action into /convert
├── Logo.tsx                    # Inline aperture logo lockup linking to the landing page
├── Navbar.tsx                  # Sticky nav, 80% background, 12px backdrop blur
├── PageTransition.tsx          # Route transition wrapper for the shell layout
├── ResultCard.tsx              # Output card with size delta, format and download action
├── ResultGrid.tsx              # Responsive grid of ResultCard instances for a finished batch
├── ResultStats.tsx             # Aggregate count and size delta for a finished batch
├── StepIndicator.tsx           # Three-step marker: formats, upload, convert
├── StepRow.tsx                # Single labelled row used by the how-it-works section
├── TerminalWindow.tsx          # Decorative command-window frame for CLI-flavoured copy blocks
├── ThemeToggle.tsx             # Sun/moon button that flips and persists the theme
├── UploadZone.tsx              # react-dropzone wrapper: drag-over, active, error states
├── ThemeProvider.tsx           # Applies the stored theme without a flash of wrong colours (planned)
├── FormatSearch.tsx            # Debounced search filtering 40+ formats by name and category (planned)
├── ConvertButton.tsx           # Primary action in disabled, running and completion states (planned)
├── ProgressBar.tsx             # Batch-level progress with percentage and per-file aggregation (planned)
├── DownloadAllButton.tsx       # Builds and downloads a ZIP of the whole batch (planned)
├── EngineBadge.tsx             # Shows whether a format is client-engine or server-engine backed (planned)
└── CopyableFilename.tsx        # Filename with click-to-copy and confirmation state (planned)
```

```text
components/icons/
├── .gitkeep                    # Keeps the directory present; no icon modules vendored yet
├── ApertureIcon.tsx            # Aperture glyph for logo and favicon, sized via currentColor (planned)
├── FormatCategoryIcon.tsx      # Maps a category (raster, vector, RAW, archive) to a lucide icon (planned)
├── EngineClientIcon.tsx        # Chip glyph indicating browser-side conversion (planned)
└── EngineServerIcon.tsx        # Server glyph indicating local native engine conversion (planned)
```

Deviation from the target layout: `FileQueue.tsx` exists on disk and owns the ordered list of accepted files, so it is listed here rather than as `FileList.tsx`. `ThemeProvider.tsx` is planned; theme state currently lives in the app shell rather than a dedicated provider component.

### 4.7 `hooks/`

```text
hooks/
├── useConversion.ts            # Orchestrates router call, concurrency cap, progress, results
├── useFileQueue.ts             # Owns the queue; enforces the 20-file cap and size rejection
├── useFormatMatrix.ts          # Fetches and memoises the matrix of valid target formats
├── useEngineStatus.ts          # Polls /api/health once on mount and caches availability
├── useZipDownload.ts           # Assembles a JSZip archive and triggers the download
├── useTheme.ts                 # Resolves and toggles light/dark with localStorage persistence (planned)
└── useToast.ts                 # sonner wrapper mapping error codes to user-facing copy (planned)
```

### 4.8 `lib/`

`lib/convert/` is the framework-free core. It imports `File` and returns `Blob`, and must never import from `app/`, `components/`, `hooks/` or `store/`.

```text
lib/convert/
├── client-converter.ts         # Browser engine: Canvas, heic2any, magick-wasm, compression
├── server-converter.ts         # Node engine: sharp, ImageMagick, LibRaw, Ghostscript, temp files
├── router.ts                   # routeConversion(): pure engine selection with fallback order
├── formats.ts                  # Conversion matrix: valid pairs, one-way flags, client capability
├── heic.ts                     # heic2any wrapper normalising options, errors and output MIME
├── canvas.ts                   # Canvas API wrapper: decode, draw, encode, release, URL cleanup
└── engines/
    ├── sharp.ts                # sharp adapter: raster formats, quality and metadata options
    ├── imagemagick.ts          # ImageMagick adapter via child_process; PSD, PSB, XCF, RAW fallback
    ├── libraw.ts               # LibRaw dcraw_emu adapter for the 16 supported RAW formats
    ├── ghostscript.ts          # Ghostscript adapter for EPS, PS and XPS rasterisation only
    ├── detect.ts               # Probes each native engine on PATH and reports availability
    └── spawn.ts                # Guarded child_process spawn wrapper: argv arrays, no shell
```

```text
lib/utils/
├── cn.ts                       # cn() class merger combining clsx and tailwind-merge
├── file-size.ts                # formatBytes(): 24.8 MB, 480 KB, and byte-level edge cases
├── mime.ts                     # Extension to MIME mapping and reverse lookup
├── magic-bytes.ts              # File signature sniffing to validate uploads before decode
├── sanitize-filename.ts        # Strips separators, control chars and reserved names
├── download.ts                 # Triggers a Blob download and revokes the object URL
├── zip.ts                      # JSZip wrapper; deterministic collision naming inside the archive
├── api-response.ts             # Server action envelope: ok/error shapes for route handlers
├── detect-client-format.ts     # Browser-side sniffing of a picked file's real format
└── temp-files.ts               # Temp directory creation, naming and guaranteed cleanup
```

```text
lib/validation/
└── convert.ts                  # Zod schemas for POST /api/convert request bodies
```

```text
lib/constants/
├── formats.ts                  # Format registry: ids, categories, extensions, MIME, engine support
├── errors.ts                   # Error code table E001-E009 with causes and recovery hints
├── env.ts                      # Typed reads of process.env with documented defaults
├── site.ts                     # Product name, studio name and outbound social URLs
├── limits.ts                   # MAX_FILES, MAX_FILE_SIZE_MB, SERVER_MAX_FILE_SIZE_MB, timeouts
└── messages.ts                 # All user-facing copy: buttons, hints, empty states, toasts, FAQ
```

### 4.9 `types/`

```text
types/
├── format.ts                   # ImageFormat union, ImageFormatMeta, category, capability flags
├── conversion.ts               # ConversionPair, ConversionJob, ConversionResult, Failure
├── file.ts                     # QueuedFile, FileStatus, thumbnail and object URL lifecycle types
├── api.ts                      # Request/response contracts for the three API routes
├── engine.ts                   # EngineKind, EngineAdapter signature, EngineAvailability
├── store.ts                    # Zustand store shape: queue, jobs, results, action signatures
└── index.ts                    # Barrel re-export; the only barrel file in the repository
```

### 4.10 `store/`

```text
store/
└── conversionStore.ts          # Zustand store: file queue, jobs, results and the actions over them
```

### 4.11 `public/`

```text
public/
├── CAMERLOB_nav.png            # Navigation wordmark raster used by the Navbar
├── Camerlob_fav.png            # Favicon raster referenced by the app metadata
├── Camerlob_icon.png           # Square product icon for install prompts and social cards
├── logo.svg                    # Aperture glyph plus wordmark in aqua, transparent background (planned)
├── logo-wordmark.svg           # Wordmark-only lockup for tight header and footer placements (planned)
├── logo-icon-512.png           # 512x512 raster app icon for manifest and install prompts (planned)
├── favicon.ico                 # 32px aperture glyph for browsers ignoring the app-directory icon (planned)
├── og-image.png                # Static 1200x630 share image, fallback for generated-image hosts (planned)
├── apple-touch-icon.png        # 180x180 home-screen icon with an opaque background (planned)
├── robots.txt                  # Static robots file used when the metadata route is bypassed (planned)
├── site.webmanifest            # Static mirror of app/manifest.ts for legacy and offline clients (planned)
└── wasm/
    ├── .gitkeep                # Keeps the directory present; the WASM payload is not vendored yet
    ├── magick.wasm             # magick-wasm payload, fetched on demand, never in the initial bundle (planned)
    └── magick.js               # magick-wasm loader served same-origin to avoid CDN coupling (planned)
```

### 4.12 `styles/`

```text
styles/
├── globals.css                 # Imports tokens, Tailwind layers, resets, color-scheme, motion
├── tokens.css                  # Every Deep Aqua custom property: colour, radius, shadow, glow
├── animations.css              # Keyframes: fade-up, draw-check, shimmer, pulse-glow, gradient shift
└── scrollbar.css               # Custom thin aqua scrollbar for the grid and result area
```

### 4.13 `scripts/`

```text
scripts/
├── audit-matrix.ts             # CLI audit of the declared format matrix against the real registry
├── check-engines.ts            # Probes ImageMagick, LibRaw, Ghostscript; non-zero exit on failure
├── install-engines.sh          # Interactive macOS/Linux/WSL installer writing correct env paths (planned)
├── install-engines.ps1         # Windows PowerShell equivalent using winget or Chocolatey (planned)
├── seed-test-files.ts          # Generates one small sample per format into tests/fixtures/ (planned)
└── generate-favicon.ts         # Renders the aperture glyph to every favicon and touch-icon size (planned)
```

### 4.14 `tests/`

```text
tests/
├── setup.ts                    # Vitest setup: jest-dom matchers, canvas mocks, temp directory (planned)
├── unit/                       # Unit specs (empty; .gitkeep only)
│   ├── formats.test.ts         # Registry integrity: unique ids, extensions, matrix symmetry (planned)
│   ├── router.test.ts          # Engine selection and fallback branches per format-pair class (planned)
│   ├── sanitize-filename.test.ts # Traversal, unicode, Windows reserved names, length caps (planned)
│   └── file-size.test.ts       # Boundaries: 0, 1, 1023, 1024, 1 MB, 1 GB (planned)
├── integration/                # Handler specs (empty; .gitkeep only)
│   ├── api-convert.test.ts     # POST /api/convert handlers with one fixture per engine (planned)
│   └── api-health.test.ts      # Engine detection with PATH overrides and missing-binary paths (planned)
├── e2e/                        # Playwright specs (empty; .gitkeep only)
│   ├── landing.spec.ts         # Hero, format grid and primary navigation render correctly (planned)
│   ├── convert-flow.spec.ts    # Landing to converter to result, queue limits, error toasts (planned)
│   └── result-download.spec.ts # Per-file download and ZIP download on the result page (planned)
└── fixtures/                   # Small binary sample images, one per format, under 50 KB each
```

The four directories exist on disk but hold only `.gitkeep`; no spec files are committed yet. Vitest and Playwright are configured (`vitest.config.ts`, `playwright.config.ts`), so the suites are expected to land before v1.0.0.

### 4.15 `Documents/`

```text
Documents/
├── API-REFERENCE.md            # HTTP endpoint contracts and request/response examples
├── BACKEND-ARCHITECTURE.md     # Server pipeline: routing, engines, temp files, limits
├── ENGINE-INSTALL.md           # Per-platform install and verification of the native engines
├── ERROR-CODES.md              # Error taxonomy: code, cause, user copy, recovery
├── FOLDER-ARCHITECTURE.md      # This document: the normative repository layout
├── FORMAT-MATRIX.md            # Input/output format support matrix
├── MANUAL-INSTALL.md           # Manual dependency and engine setup, verified per platform
├── PRD.md                      # Product scope, personas, formats, limits, non-goals, roadmap
├── TRD.md                      # Architecture, types, matrix, API contracts, risks and mitigations
├── UI-UX-BRIEF.md              # Deep Aqua design system: colour, type, motion, component specs
└── CHANGELOG-ARCHIVE.md        # Frozen pre-1.0 changelog, created once CHANGELOG.md is archived (planned)
```

### 4.16 Deviations and cross-references

`Documents/TRD.md` §5 predates this document. The following names are normalised here; no behaviour changes.

| TRD §5 name | Canonical name here | Reason |
|---|---|---|
| `lib/constants/formats.config.ts` | `lib/constants/formats.ts` | Constants are kebab-case; `.config` duplicates the directory name |
| `lib/convert/matrix.ts` | `lib/convert/formats.ts` | Matrix logic lives beside the router, not in a re-export shim |
| `hooks/useHealthCheck.ts` | `hooks/useEngineStatus.ts` | Named for what it exposes, matching `EngineBadge` and `/api/health` |
| `components/camerlob/NavBar.tsx` | `components/camerlob/Navbar.tsx` | One-word capitalisation, matching the UI brief prose |
| `components/camerlob/FileQueue.tsx` | `components/camerlob/FileList.tsx` | The list is presentational; queue state belongs to `useFileQueue` |
| `components/camerlob/FailedFiles.tsx` | `components/camerlob/FailedFilesList.tsx` | Explicit `List` suffix matches `FileList` and `ResultGrid` |
| `scripts/install-deps.sh` | `scripts/install-engines.sh` and `.ps1` | Native engines, not npm dependencies; Windows parity added |
| `next.config.js` | `next.config.mjs` | ESM config so `import.meta` is available for WASM and CSP setup |

Three paths exist here and not in TRD §5, because the stack summary and TRD §§10, 17 and 19 require them: `store/convert-store.ts` (Zustand 4.5.x is a declared dependency), `app/instrumentation.ts` (temp-directory sweeper and Node version check, TRD §18 rows 10 and 11) and `types/store.ts`.

---

## 5. File Naming Conventions

| Artefact | Convention | Example |
|---|---|---|
| React components | PascalCase, `.tsx` | `FormatCard.tsx`, `UploadZone.tsx` |
| shadcn primitives | kebab-case inside `components/ui/` | `button.tsx`, `progress.tsx` |
| Hooks | camelCase with `use` prefix | `useConversion.ts`, `useFileQueue.ts` |
| Utility functions | kebab-case | `file-size.ts`, `sanitize-filename.ts` |
| Constants modules | kebab-case, plural noun | `formats.ts`, `limits.ts`, `errors.ts` |
| Type modules | kebab-case, singular domain noun | `format.ts`, `conversion.ts`, `engine.ts` |
| Engine adapters | kebab-case, engine product name | `imagemagick.ts`, `libraw.ts` |
| API routes | kebab-case directories with `route.ts` | `app/api/convert/route.ts` |
| Pages and layouts | Next.js reserved filenames | `page.tsx`, `layout.tsx`, `loading.tsx` |
| Unit and integration tests | Mirror the source path, `.test.ts` | `lib/convert/router.ts` to `tests/unit/router.test.ts` |
| E2E tests | Feature name, `.spec.ts` | `tests/e2e/convert-flow.spec.ts` |
| Scripts | kebab-case verb phrase | `check-engines.ts`, `seed-test-files.ts` |
| Git hooks | Husky hook names, no extension | `pre-commit`, `commit-msg` |

Two rules resolve the obvious edge cases. Reserved Next.js filenames are never renamed, and a test never lives beside its source: all tests are under `tests/` so unit, integration and e2e boundaries stay visible in one listing.

---

## 6. Import Path Aliases

Aliases are declared once in `tsconfig.json` and are mandatory in application code. Relative imports beyond one level are a review comment.

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      "@/styles/*": ["./styles/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "out", "tests/e2e"]
}
```

| Alias | Resolves to | Used for |
|---|---|---|
| `@/*` | `./*` | Anything not covered by a narrower alias, including `@/store/*` and `@/tests/*` |
| `@/components/*` | `./components/*` | Feature and primitive components |
| `@/hooks/*` | `./hooks/*` | Custom hooks |
| `@/lib/*` | `./lib/*` | Conversion core, utilities and constants |
| `@/types/*` | `./types/*` | Type-only imports; always written as `import type` |
| `@/styles/*` | `./styles/*` | Global stylesheet imports from `app/globals.css` |

Narrow aliases are declared before `@/*` so the more specific mapping wins in editors and bundlers. `@/lib/*` and `@/types/*` must never be crossed: `lib/` may import types, `types/` may never import `lib/`.

---

## 7. GitHub-Specific Files Explained

| File | Purpose and maintenance rule |
|---|---|
| `.gitignore` | Ignores dependencies, build output, env files, logs, coverage, IDE metadata, OS files and the temp upload root. Reviewed whenever a new tool is added |
| `.gitattributes` | Sets `* text=auto eol=lf` and marks images, `.wasm` and `.ico` as binary so checkouts are byte-identical everywhere |
| `.editorconfig` | UTF-8, LF, two-space indent, final newline; the floor beneath Prettier |
| `LICENSE` | MIT. Use, copy, modify, merge, publish, distribute — with attribution and no warranty |
| `README.md` | The conversion funnel: identity, proof, install, usage, contribution, licence. Reviewed every release |
| `CONTRIBUTING.md` | Fork, branch naming, Conventional Commits, the `pnpm run verify` gate, and the rule that a new format needs a registry entry plus a test |
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 verbatim, with enforcement contacts |
| `SECURITY.md` | Private disclosure channel and supported-version policy, reviewed before each release |
| `CHANGELOG.md` | Keep a Changelog 1.1.0: Added, Changed, Fixed, Removed, newest version first |
| `.github/ISSUE_TEMPLATE/` | Two forms plus `config.yml`. Bug reports capture format pair, OS, browser and `check-engines` output, which is what makes native-engine issues reproducible |
| `.github/PULL_REQUEST_TEMPLATE.md` | Checklist: tests, strict types, keyboard access, reduced motion, `CHANGELOG.md` entry, screenshot for visual changes |
| `.github/workflows/ci.yml` | The merge gate: format, lint, typecheck, unit, integration, build, E2E |
| `.github/workflows/release.yml` | Tag-driven: verify, build, GitHub Release from `CHANGELOG.md`, standalone output as artefact |
| `.github/dependabot.yml` | Weekly pnpm and Actions updates, grouped per ecosystem to keep pull requests reviewable |

---

## 8. CI/CD Pipeline (GitHub Actions)

### 8.1 `ci.yml`

Triggers: push to `main`, pull request targeting `main`, manual dispatch. Node is pinned via `.nvmrc`; pnpm comes from the `packageManager` field via Corepack, so the runner version can never drift from a developer's.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NEXT_TELEMETRY_DISABLED: '1'

jobs:
  quality:
    name: Lint, format, types
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Verify native engines
        run: pnpm check-engines
      - run: pnpm run format:check
      - run: pnpm run lint
      - run: pnpm run typecheck

  test:
    name: Unit and integration tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: sudo apt-get update && sudo apt-get install -y imagemagick libraw-tools ghostscript
      - run: pnpm run test:coverage

  build:
    name: Production build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - uses: actions/upload-artifact@v4
        with:
          name: next-standalone
          path: .next/standalone
          retention-days: 7

  e2e:
    name: End-to-end tests
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

Job ordering is intentional: `quality` fails in under two minutes, `test` and `build` run in parallel, and the slowest browser suite starts only after a successful build. A red pipeline therefore points at the actual defect rather than at a downstream symptom.

### 8.2 `release.yml`

Triggers on tags matching `v*`. It re-runs the full gate, extracts the version from the tag, publishes a GitHub Release using the matching `CHANGELOG.md` section, and uploads the standalone server output plus the engine status report as artefacts.

```yaml
name: Release

on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      tag:
        description: Tag to release
        required: true

permissions:
  contents: write

jobs:
  release:
    name: Publish release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Resolve version from tag
        id: version
        run: echo "value=${GITHUB_REF_NAME#v}" >> "$GITHUB_OUTPUT"
      - name: Verify tag matches package.json
        run: |
          test "v$(node -p "require('./package.json').version")" = "$GITHUB_REF_NAME" \
            || (echo "Tag does not match package.json version" && exit 1)
      - name: Verify native engines
        run: pnpm check-engines | tee engine-report.txt
      - run: pnpm run verify
      - run: pnpm run build
      - name: Create GitHub release
        run: |
          gh release create "$GITHUB_REF_NAME" \
            --title "$GITHUB_REF_NAME" \
            --generate-notes \
            --notes-file CHANGELOG.md \
            engine-report.txt
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/upload-artifact@v4
        with:
          name: camerlob-${{ steps.version.outputs.value }}
          path: |
            .next/standalone
            engine-report.txt
          retention-days: 30
```

The version-mismatch step is the one that prevents the most common release mistake: tagging `v1.1.0` while `package.json` still says `1.0.0`.

---

## 9. `README.md` Structure

| # | Section | Content |
|---|---|---|
| 1 | Hero | Centred logo, tagline, one-line promise, two calls to action, demo GIF |
| 2 | Badges | CI status, release version, licence, TypeScript strict, PRs welcome, sponsor |
| 3 | One-liner | "Convert any image format to any other — locally, free, unlimited." |
| 4 | Why local-first | No uploads, no signup, no watermark, files never leave the machine |
| 5 | Demo | Screen recording of landing to converter to result to ZIP download |
| 6 | Features | Batch of 20, 40+ formats, client-side first with native fallback, ZIP, dark and light, MIT |
| 7 | Supported formats | Table of format, category, extensions, engine, two-way or one-way |
| 8 | Quick start | `pnpm install`, `pnpm check-engines`, `pnpm run dev` |
| 9 | Engine setup | Per-OS commands for ImageMagick, LibRaw and Ghostscript, plus the Docker alternative |
| 10 | Environment | Table of every variable in `.env.example` with scope and default |
| 11 | Usage | Web walkthrough, the 20-file rule, size ceilings, CLI on the roadmap |
| 12 | Scripts | Every `package.json` script with a one-line description |
| 13 | Testing | How to run unit, integration and E2E suites, and how to seed fixtures |
| 14 | Deployment | Vercel limits and the 4.5 MB body cap, then self-hosting with Docker |
| 15 | Contributing | Links to `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, open issues |
| 16 | Roadmap | Table from PRD §14 and TRD §19, marked out of scope for v1 |
| 17 | Credits | Inspiration, icon set, fonts, acknowledgements |
| 18 | Licence | MIT, linking to `LICENSE` |

Sections 7 and 16 derive from `lib/constants/formats.ts` and the roadmap tables. If they drift from the code, they are wrong.

---

## 10. `.gitignore` Full Content

```gitignore
# ---- Node ----
node_modules/
.pnpm-store/

# ---- Next.js ----
.next/
out/
next-env.d.ts
.vercel/

# ---- Build output ----
build/
dist/
*.tsbuildinfo

# ---- Environment ----
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.*.local

# ---- Native engine temp workspace (server-side conversion) ----
/tmp/camerlob/
.camerlob-tmp/

# ---- Test output ----
coverage/
playwright-report/
test-results/
blob-report/
.playwright/

# ---- Logs ----
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# ---- Editors ----
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
!.vscode/launch.json
.idea/
*.swp
*.swo

# ---- OS ----
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
Thumbs.db
ehthumbs.db
desktop.ini

# ---- Misc ----
*.pem
.cache/
```

The `.vscode` block is the pattern most often got wrong: personal settings are ignored, while the three shared files in §4.3 stay tracked so a new contributor gets sane defaults automatically.

---

## 11. Environment Files

`.env.example` is the committed contract; `.env.local` is never committed and is created by copying it.

```bash
# ---- Server-only (never prefixed NEXT_PUBLIC_) ----
SERVER_MAX_FILE_SIZE_MB=50
IMAGEMAGICK_PATH=/usr/bin/magick
LIBRAW_PATH=/usr/bin/dcraw_emu
GHOSTSCRIPT_PATH=/usr/bin/gs
EXIFTOOL_PATH=/usr/bin/exiftool
TEMP_UPLOAD_DIR=/tmp/camerlob
NODE_ENV=development
```

| Variable | Scope | Default | Notes |
|---|---|---|---|
| `SERVER_MAX_FILE_SIZE_MB` | Server | `50` | Per-file server ceiling; also the escalation threshold |
| `IMAGEMAGICK_PATH` | Server | `magick` | Falls back to `PATH` resolution when unset or blank |
| `LIBRAW_PATH` | Server | `dcraw_emu` | Falls back to `PATH` resolution when unset or blank |
| `GHOSTSCRIPT_PATH` | Server | `gs` | Falls back to `PATH` resolution when unset or blank; required only for EPS, PS and XPS |
| `EXIFTOOL_PATH` | Server | `exiftool` | Falls back to `PATH` resolution when unset or blank; optional metadata engine |
| `TEMP_UPLOAD_DIR` | Server | OS temp `camerlob` | Must resolve outside the repository; created with mode `0700` |
| `NODE_ENV` | Server | `development` | Managed by Next.js; declared so the detection script and self-hosters see it |

`.env.example` is the authoritative list and the table above mirrors it exactly, as does `Documents/TRD.md` §14.2. Every variable is read through `lib/constants/env.ts`, the only module permitted to touch `process.env`; blank is treated as unset there, once. `NO_COLOR` is read by `scripts/check-engines.ts` alone and is commented out in `.env.example` because it is a shell convention rather than application configuration.

v1 declares no `NEXT_PUBLIC_*` variables. `MAX_FILES`, `MAX_FILE_SIZE_MB`, `MAX_BATCH_SIZE_MB`, `MAX_CONCURRENCY` and `ENGINE_TIMEOUT_MS` are exported constants in `lib/constants/limits.ts`, and the product name and canonical URL are literals in `lib/constants/site.ts` and `app/layout.tsx`, so that the single source of truth for limits is code rather than two parallel places. They are promoted to env vars in v2.1 when the public API introduces per-user quotas.

---

## 12. Scaling to v2.0

The structure absorbs the roadmap in `Documents/TRD.md` §19 without moving existing files. Growth happens by addition, never by relocation.

| Addition | Where it goes | What changes today |
|---|---|---|
| A new format | One entry in `lib/constants/formats.ts` plus, if unsupported, one engine file in `lib/convert/engines/` | Nothing; matrix, picker, search, health badge and API all read the registry |
| A new page | A new folder under `app/` with `page.tsx` and an optional `layout.tsx` | Nothing beyond metadata and sitemap entries |
| A new engine | A file in `lib/convert/engines/` and one line in the `router.ts` registry | Nothing; callers never name an engine |
| Watch-folder daemon (v1.1) | `scripts/watch-folder.ts`, importing `server-converter.ts` unchanged | Nothing; `lib/convert/` has no Next.js dependency |
| CLI (v1.2) | `packages/cli/` at the pnpm-workspace transition, sharing `lib/` by path | Root `tsconfig.json` extends a new `tsconfig.base.json` |
| Desktop app (v1.3) | `packages/desktop/` wrapping the standalone output | Nothing; `output: 'standalone'` is already set |
| Supabase sync (v2.0) | `lib/supabase/` with `client.ts`, `schema.sql`, `sync.ts`; the store gains one action | Opt-in metadata only; `lib/convert/` untouched |
| Public REST API (v2.1) | `app/api/v1/**` reusing existing handlers, plus `lib/rate-limit.ts` | Handlers move to `lib/handlers/` only if duplication appears |

The property that makes this work is that `lib/convert/` speaks only `File` in and `Blob` out. Any new host — browser, Node server, CLI, daemon, desktop shell — imports it unchanged, so the v1.2 monorepo move is a `pnpm-workspace.yaml` and a `tsconfig.base.json` rather than a rewrite.

---

## 13. Anti-Patterns to Avoid

| Do not | Do instead | Why |
|---|---|---|
| Flatten every component into one `components/` folder | Group by feature under `components/camerlob/`; vendored primitives only in `components/ui/` | A feature change becomes one reviewable diff in one directory |
| Mix client and server logic in one converter file | Split into `client-converter.ts` and `server-converter.ts`, joined only by `router.ts` | Preserves the boundary and framework independence |
| Hardcode a format, limit or message anywhere else | Read it from `lib/constants/formats.ts`, `limits.ts` or `messages.ts` | One source of truth; a new format is a one-line change |
| Import through `../../..` | Use the `@/` aliases from §6 | Refactors do not touch every import; navigation is one keystroke |
| Commit `.env.local` or put secrets in `.env.example` | Commit only `.env.example`; keep real values local | A leaked key in git history stays leaked |
| Store test images in the root or in `public/` | Use `tests/fixtures/`, generated by `pnpm run seed-test-files` | Keeps the repo small and sample-image licensing clear |
| Create a barrel file in every folder | Barrel only at `types/index.ts`; direct paths elsewhere | Barrels hide cycles and slow type-checking |
| Import `store/`, `hooks/` or `components/` from `lib/` | Keep `lib/` framework-free and lift state upward | `lib/` stays importable from a CLI, daemon or desktop shell |
| Put `"use client"` in a shared component | Add it at the interactive leaf and pass callbacks down | Keeps the server-rendered surface as large as possible |
| Bump a dependency by editing `package.json` | Use `pnpm update` and let Dependabot open the pull request | Manifest and lockfile stay consistent |
| Fix formatting inside a feature pull request | Run `pnpm run format` locally; the pre-commit hook enforces it | Diffs stay readable and reviews stay on logic |
| Merge a new format with no fixture and no test | Add both in the same pull request | An untested format is an untrustworthy format |

---

## 14. Contributor Onboarding

1. **Fork** the repository on GitHub, so the contributor's origin remote points at their own account.
2. **Clone** the fork and add the upstream remote: `git remote add upstream https://github.com/<org>/camerlob.git`.
3. **Install dependencies** with `pnpm install`. Corepack pins the pnpm version from the `packageManager` field.
4. **Verify the native engines** with `pnpm check-engines`, which prints a status table naming every missing binary.
5. **Install what is missing:**
   - macOS: `brew install imagemagick libraw ghostscript`, then export `IMAGEMAGICK_PATH="$(brew --prefix)/bin/magick"`.
   - Ubuntu or Debian: `sudo apt-get install -y imagemagick libraw-tools ghostscript`.
   - Windows: `winget install ImageMagick.ImageMagick ArtifexSoftware.GhostScript`, or run `pnpm run install-engines` on PowerShell. LibRaw has no winget package; ImageMagick's `dcraw` delegate is the documented fallback.
   - Or skip all of it with `docker compose up` and develop against the container.
6. **Start the app** with `pnpm run dev` and open `http://localhost:3000`.
7. **Pick an issue** labelled `good first issue` or `help wanted`, and comment before starting so two contributors do not duplicate work.
8. **Create a branch** named `feat/short-description`, `fix/short-description` or `docs/short-description`.
9. **Run the gate** before pushing: `pnpm run lint && pnpm run typecheck && pnpm test`. `pnpm run verify` adds the format check.
10. **Push and open a pull request** against `main`, complete the `.github/PULL_REQUEST_TEMPLATE.md` checklist, and add a `CHANGELOG.md` entry under `Unreleased` if the change is user-visible.

Expected time from clone to first merged pull request: under thirty minutes for documentation or styling, about two hours for a change that adds an image format.

---

## 15. Appendix

### 15.1 Related documents

| Document | Location | Authority |
|---|---|---|
| Product Requirements Document | `Documents/PRD.md` | Scope, formats, limits, non-goals |
| UI/UX Design Brief | `Documents/UI-UX-BRIEF.md` | Deep Aqua tokens, component specs, design assets |
| Technical Requirements Document | `Documents/TRD.md` | Architecture, types, matrix, API contracts, risks |
| Folder & File Architecture | `Documents/FOLDER-ARCHITECTURE.md` | Repository layout, naming, CI wiring |

### 15.2 Cross-reference matrix

| Concern | This document | Other document |
|---|---|---|
| A file's location | §4 | `Documents/TRD.md` §5 for behaviour |
| A file's name | §5 | `Documents/UI-UX-BRIEF.md` §19 for asset names |
| An import path | §6 | `Documents/TRD.md` §6 for type shapes |
| A limit's value | §11 | `Documents/TRD.md` §10.1 and §14.2 |
| A user-facing string | `lib/constants/messages.ts` | `Documents/UI-UX-BRIEF.md` §8 and §12 |
| A colour value | `styles/tokens.css` | `Documents/UI-UX-BRIEF.md` §16 |
| A CI step | §8 | `Documents/TRD.md` §15 and §16 |

### 15.3 Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0.0 | `_YYYY-MM-DD_` | `_author_` | Initial architecture document; full v1.0.0 repository layout, naming conventions, CI/CD wiring and contributor onboarding |

### 15.4 Open questions for the next revision

- Should `tests/` move under each source folder once the suite exceeds roughly eighty files, or stay centralised for discoverability?
- Does `public/site.webmanifest` duplicate `app/manifest.ts` unnecessarily, or is the static copy required for legacy clients?
- At what point does `lib/convert/` become `packages/convert/` in the v1.2 workspace transition?

---

_End of document. This file is normative for repository layout; behaviour remains governed by `Documents/TRD.md`._
