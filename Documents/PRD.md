# Camerlob — Product Requirements Document

## 1. Document Metadata

| Field | Value |
|-------|-------|
| Document Title | Camerlob Product Requirements Document |
| Product | Camerlob |
| Tagline | "Convert any image. Any format. Free. Forever." |
| Version | 1.0 (MVP) |
| Author | Solo Developer (Product Owner) |
| Date | YYYY-MM-DD |
| Status | Draft |
| Document Type | Product Requirements Document (PRD) |
| License | MIT |

---

## 2. Executive Summary

Camerlob is a **local-first, unlimited, free image format converter** delivered as a web application. It runs entirely on the user's own machine — either on `localhost`, or deployed as a static/edge application. The core promise is simple: convert any image, in any supported format, to any compatible target format, with no account, no upload, no watermark, and no usage cap.

**Problem statement.** Existing converters are paid or watermarking, limited by daily quotas, dependent on uploading user data to a remote server, or slow because of round-trip network latency and server queues. Uploading is unacceptable for RAW camera files, client work under NDA, and personal photographs. Desktop utilities are paid or nagware. Generic optimisers handle three or four formats. None cover the long tail of professional and camera formats in a single free interface.

**Solution statement.** Camerlob performs conversion on the user's own hardware. A **client-side** path (Canvas API, `heic2any`, `magick-wasm`) handles consumer raster formats inside the browser with zero network traffic. A **localhost server-side** path (`sharp`, ImageMagick, LibRaw, Ghostscript) unlocks RAW camera formats, layered PSD/PSB, vector EPS/PS/XPS, and publication formats. The user picks a source format, picks a target format, drops up to 20 files, and gets individual downloads or a single ZIP.

**Scope of v1.** The MVP covers 40+ formats, two-way conversion between compatible pairs, batches of up to 20 files, a landing page, a converter page, and a results page with per-file and ZIP download. There is no database, no authentication, and no cloud storage. The application is a single-user tool by design.

---

## 3. Goals & Non-Goals

### Goals

- **Free.** No cost, no trial, no watermark, no upsell.
- **Unlimited.** No daily quota, no file-size paywall, no conversion counter.
- **Private.** Images never leave the user's device; no telemetry, no analytics.
- **Fast.** Client-side conversion for standard formats; perceived latency under 2 seconds for small files.
- **Broad format support.** 40+ formats spanning consumer raster, professional, and RAW camera categories.
- **Two-way conversion.** Any compatible pair `A → B` also supports `B → A`.
- **Batch processing.** Up to 20 files per batch.
- **Zero friction.** No signup, no login, no configuration before first use.
- **Bulk download.** One-click ZIP of all converted outputs.

### Non-Goals (explicitly out of scope for v1)

- No user accounts, authentication, or profiles.
- No cloud storage or remote file hosting.
- No persistent conversion history.
- No public API in v1.
- No video conversion.
- No image editing — no crop, rotate, filters, or adjustments.
- No PDF to image conversion.

---

## 4. Target Users & Personas

| # | Persona | Context | Primary Need | Success Moment |
|---|---------|---------|--------------|----------------|
| 1 | **The Photographer** | Imports CR2/NEF/ARW files from an SD card; needs fast previews and client-ready exports | RAW to JPG/PNG export | A 40MP RAW becomes a shareable JPG without uploading it anywhere |
| 2 | **The Designer** | Prepares assets for web projects; receives layered or print files from clients | PSD/TIFF to WEBP | A layered PSD is flattened to a web-optimised WEBP in one step |
| 3 | **The Everyday User** | Receives HEIC photos from an iPhone; needs a universally readable file | HEIC to JPG | A photo is sent over WhatsApp or email without "unsupported format" errors |
| 4 | **The Privacy-Conscious User** | Refuses to place personal or family photos on third-party servers | Fully offline conversion | A document of the architecture proves no bytes are transmitted |

**Persona detail.**

- **Persona 1 — The Photographer.** Works from a desktop with local tools installed. Cares about colour fidelity and about not shipping 60MB originals to an unknown server. Conversion is a means to an end: fast previews, quick JPG exports, occasional TIFF delivery.
- **Persona 2 — The Designer.** Values predictability over feature depth. Needs reduced file sizes to hit web performance budgets.
- **Persona 3 — The Everyday User.** Low technical tolerance, must not read a manual. The interface has to make "source format" and "target format" obvious, and the rest has to be drag-and-drop.
- **Persona 4 — The Privacy-Conscious User.** Reads privacy policies before uploading. Needs a visible, verifiable reason to trust the tool: a locally running server, an MIT licence, and open source code.

---

## 5. Functional Requirements

### 5.1 Landing Page

| Element | Requirement |
|---------|-------------|
| Hero | Logo, tagline ("Convert any image. Any format. Free. Forever."), and a primary CTA routing to the converter |
| Format Grid | Grid of supported format chips so breadth of support is legible before interaction |
| How It Works | Three-step section: Choose formats → Add files → Download |
| Features Strip | Free, unlimited, private, offline-capable, 40+ formats, batch of 20 |
| Footer | Product name, version, MIT licence notice, source repository link |

### 5.2 Converter Page

**Step 1 — Choose Source Format.**
Searchable dropdown or grid listing 40+ formats. Search matches on format name and extension (e.g. `cr2`, `Canon RAW`).

**Step 2 — Choose Target Format.**
Target list is filtered against the selected source. Every pair that can be converted `A → B` is guaranteed to be selectable as `B → A` where technically possible.

**Step 3 — Upload.**
Drag-and-drop zone plus click-to-browse input. Accepts up to 20 images per batch.

| Requirement | Detail |
|-------------|--------|
| File preview cards | Thumbnail, filename, file size, and a remove button per file |
| Counter | Live display such as "7 / 20 files" |
| Hard limit | Enforced at 20 files; further selections rejected with a **toast notification** |
| Validation | Files not matching the declared source format are rejected before conversion |
| Convert button | Disabled until source format, target format, and at least one valid file are present |
| Progress | Per-file progress bar rendered during conversion |
| Completion | On batch completion, navigate to the Result page |

### 5.3 Result Page

| Element | Requirement |
|---------|-------------|
| Summary header | Success/failure count, e.g. "19 of 20 converted" |
| Per-file card | Thumbnail, original filename, transformed filename (extension swapped), size before and after, individual download button |
| Download All as ZIP | Primary button; bundles every successful output via JSZip |
| Convert More Files | Returns to the converter with state reset |
| Clear Results | Empties the result set and returns to an empty state |
| Failed files section | Lists failed files with the reason for failure |

---

## 6. Supported Formats

Camerlob supports 40+ image formats across three categories.

| Category | Formats |
|----------|---------|
| Consumer Raster | JPG, JPEG, JFIF, PNG, WEBP, GIF, BMP, ICO, TIFF, TIF, AVIF, HEIC, HEIF, TGA, PPM |
| Professional | PSD, PSB, EPS, PS, XPS, XCF, PUB, ODD, ODG |
| RAW Camera | CR2, CR3, CRW, NEF, ARW, DNG, ORF, RAF, RW2, PEF, 3FR, MRW, DCR, ERF, MOS, X3F |

**Availability notes.**

- **Client-side path** covers the consumer raster formats that the browser can decode and encode (JPG, PNG, WEBP, GIF, BMP, ICO, TIFF, AVIF, TGA, HEIC/HEIF via `heic2any`).
- **Server-side path** is required for RAW camera formats, professional layered formats, and vector formats. These are available when running on `localhost` with the native dependencies installed.

---

## 7. Two-Way Conversion Matrix

Every pair that converts in one direction converts in the other, wherever the target format can represent the source's data. This is a product guarantee, not an accident of implementation.

| Pair | Direction | Path | Notes |
|------|-----------|------|-------|
| JPG ↔ PNG | Two-way | Client-side | Lossless raster ↔ lossy raster |
| JPG ↔ WEBP | Two-way | Client-side | Modern web format |
| JPG ↔ AVIF | Two-way | Client-side | Highest compression among supported targets |
| HEIC ↔ JPG | Two-way | Client-side | Primary iPhone use case |
| WEBP ↔ PNG | Two-way | Client-side | Transparency preserved both ways |
| TIFF ↔ JPG | Two-way | Server-side | TIFF also supported client-side via browser decoders |
| CR2 → JPG | One-way in practice | Server-side | RAW cannot be encoded to; JPG cannot hold RAW data |
| PSD → JPG | One-way (export) | Server-side | Layered format exports to raster only |

**Asymmetry rules.** Two rules govern the exceptions:

- **Layered formats are export-only.** PSD, PSB, and XCF convert to raster targets (JPG, PNG, WEBP, TIFF). They cannot be created from a raster image, because layer structure cannot be synthesised.
- **Vector formats are export-only.** EPS, PS, and XPS convert to raster targets for the same reason: path, vector, and colour-space information is not recoverable from a bitmap.
- **RAW is a source-only family.** RAW formats (CR2, NEF, ARW, DNG, and the rest) are decoders only. They appear in the source format list and never in the target list.

---

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Client-side conversion completes in **under 2 seconds** for files under 5MB. RAW conversion on `localhost` completes in **under 10 seconds**. |
| Privacy | **100% local processing** for client-side formats. No telemetry, no analytics, no outbound requests containing image data. |
| Reliability | Corrupt or unsupported files are handled gracefully; the batch **skips the failure and continues**. |
| Usability | Zero learning curve. Mobile responsive. **Dark mode by default** with a light-mode toggle. |
| Portability | Runs on Windows 10+, macOS 11+, and Ubuntu 20.04+. No OS-specific behaviour outside the optional native toolchain. |
| Accessibility | Fully keyboard navigable. Text and interactive elements meet **WCAG AA** contrast. |

---

## 9. Technical Architecture

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Client-side conversion | Canvas API, `heic2any`, `magick-wasm` |
| Server-side conversion (localhost only) | `sharp`, ImageMagick, LibRaw, Ghostscript |
| ZIP creation | JSZip (client-side) |
| State management | React `useState` / Zustand |
| Data layer | **None** — no database, no authentication, no cloud storage |

### Architecture Diagram

```text
┌────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                       │
│                                                            │
│   Landing ──► Converter ──► Result                         │
│                  │                                         │
│                  ├─ Drag & Drop / Browse  (≤ 20 files)    │
│                  ├─ Client-side Engine                     │
│                  │    • Canvas API   (JPG, PNG, WEBP)      │
│                  │    • heic2any     (HEIC, HEIF)          │
│                  │    • magick-wasm  (TIFF, TGA, BMP, ICO) │
│                  └─ JSZip  (Download All as ZIP)           │
│                                                            │
└───────────────────────┬────────────────────────────────────┘
                        │  files stay in-process for
                        │  client-side formats
                        ▼
┌────────────────────────────────────────────────────────────┐
│           LOCAL NEXT.JS SERVER  (localhost only)           │
│                                                            │
│   POST /api/convert   (multipart/form-data)                │
│                  │                                         │
│                  ├─ sharp         (TIFF, WEBP, AVIF, PNG)  │
│                  ├─ ImageMagick   (PSD, EPS, PS, XPS, XCF) │
│                  ├─ LibRaw        (CR2, NEF, ARW, DNG, …)  │
│                  └─ Ghostscript   (EPS, PS, PDF render)    │
│                                                            │
│   Buffer ──► Browser ──► <a download> / JSZip              │
│                                                            │
│   No database. No auth. No cloud storage. No telemetry.    │
└────────────────────────────────────────────────────────────┘

Vercel path: browser-only, client-side formats only.
No server route invoked (4.5MB payload limit, 10s timeout).
```

### Key File Paths

```text
Documents/PRD.md            # This document
app/page.tsx                # Landing page
app/convert/page.tsx        # Converter page
app/result/page.tsx         # Result page
app/api/convert/route.ts    # Localhost-only conversion endpoint
lib/formats.ts              # Format registry + two-way matrix
lib/convert/client.ts       # Canvas / heic2any / magick-wasm path
lib/convert/server.ts       # sharp / ImageMagick / LibRaw path
lib/zip.ts                  # JSZip bundling
store/convert-store.ts      # Zustand batch + result state
components/FormatPicker.tsx # Searchable source/target selector
components/FileDropzone.tsx # Drag & drop + browse, 20-file cap
components/ResultCard.tsx   # Per-file output card
```

---

## 10. User Flows

### Flow A — Convert JPG to AVIF (client-side path)

1. User opens Camerlob on `localhost` and clicks the hero CTA.
2. User selects source format **JPG**, then target format **AVIF** from the filtered list.
3. User drops `.jpg` files onto the dropzone (up to 20); each passes format validation and appears as a preview card with thumbnail, name, and size.
4. The **Convert** button becomes enabled; the user clicks it.
5. The Canvas API decodes and re-encodes each file in the browser. A per-file progress bar fills. No network request carries image data.
6. On completion the browser navigates to the Result page, showing before/after sizes and download buttons.

### Flow B — Convert CR2 (Canon RAW) to JPG (server-side path)

1. User selects source format **CR2** from the searchable format list, then target format **JPG**.
2. User drops `.cr2` files from an SD card; they appear as preview cards.
3. The user clicks **Convert**; the client detects CR2 is not client-side capable and posts the files to `POST /api/convert`.
4. The local Next.js server routes the job to **LibRaw** for RAW development, then to **ImageMagick** or `sharp` for final JPG encoding.
5. The response Buffer returns to the browser; per-file progress completes.
6. The user lands on the Result page and downloads the JPGs individually or as a ZIP.

### Flow C — Batch convert 20 HEIC files to JPG and download as ZIP

1. User selects source format **HEIC** and target format **JPG**, then selects 20 `.heic` files; the counter reads "20 / 20 files".
2. Attempting to add a 21st file is rejected with a toast notification stating the 20-file limit.
3. The user clicks **Convert**; `heic2any` decodes and re-encodes each file client-side.
4. All 20 progress bars complete; the user is routed to the Result page showing "20 of 20 converted".
5. The user clicks **Download All as ZIP**; JSZip assembles `heic-batch.zip` in the browser and triggers a download.
6. Optional follow-up: **Convert More Files** starts a new batch, or **Clear Results** resets.

---

## 11. UI/UX Principles

1. **Zero learning curve.** No onboarding tour, no help modal, no manual. A first-time user converts a file without instruction.
2. **Inline interactions, not modals.** Format selection, file management, progress, and errors all render inline. Modals are avoided because they hide context and break the mental model.
3. **Toast notifications.** Success and failure are reported via toasts, including the 20-file limit rejection and conversion completion.
4. **Real-time progress feedback.** Every file gets its own progress bar so the user can see the batch is advancing.
5. **Dark mode by default**, with a light-mode toggle. Dark is the default because the tool is used in photography and design contexts.
6. **Mobile responsive.** Layout collapses cleanly to a single column; touch targets remain usable.
7. **Fast by default.** Perceived latency under 2 seconds for small files, with the progress bar covering the gap for large or RAW conversions.

---

## 12. Constraints & Assumptions

**Constraints.**

- **20 files maximum per batch** is a hard limit, enforced in the UI and in the API route.
- **Localhost is required for full format support.** RAW, PSD/PSB, EPS/PS, and other professional formats depend on native tools that do not run on a serverless platform.
- **Vercel deployment supports client-side formats only,** constrained by the 4.5MB function payload limit and the 10s execution timeout.
- **Native dependencies must be installed manually** for full local support: ImageMagick, LibRaw, and Ghostscript.

**Assumptions.**

- The user runs Camerlob on hardware capable of decoding large RAW files; conversion is CPU-bound, not GPU-bound.
- The user understands the distinction between source and target format at first glance; the interface communicates it without a tutorial.
- Browser targets are the last two major versions of Chrome, Edge, Firefox, and Safari, all of which support the Canvas API and WASM.
- The project is MIT-licensed, so redistribution and self-hosting require no additional permission.
- Single-user operation means no concurrency, rate limiting, or abuse prevention is required in v1.

---

## 13. Success Metrics (MVP)

| # | Metric | Target | Verification Method |
|---|--------|--------|---------------------|
| 1 | Format coverage | **100%** of the 40+ listed formats successfully convert at least once in the test suite | Automated test suite iterating the format registry |
| 2 | Batch stability | A 20-file batch completes without a crash or unhandled error | Manual and scripted 20-file batch runs |
| 3 | ZIP reliability | ZIP download works in all supported browsers | Cross-browser test matrix |
| 4 | Privacy guarantee | **Zero cloud API calls** during any conversion | Network tab inspection during every flow |
| 5 | Page load | Under **1.5s** on `localhost` for landing and converter pages | Lighthouse / local timing measurement |

---

## 14. Future Roadmap (Out of Scope for v1)

| Release | Feature | Rationale |
|---------|---------|-----------|
| v1.1 | Watch folder automation | Monitor a directory and convert new files automatically on ingest |
| v1.2 | CLI tool | Scriptable headless conversion for batch pipelines and CI |
| v1.3 | Desktop packaging (Electron / Tauri) | Native install with the toolchain bundled, removing manual dependency setup |
| v2.0 | Optional user accounts with Supabase for conversion history sync | Only if users ask for history; opt-in, never required |
| v2.1 | REST API for programmatic access | Programmatic conversion for developers and automation |

All roadmap items are explicitly out of scope for v1.0 and none of them may block or alter MVP requirements.

---

## 15. Glossary

| Term | Definition |
|------|------------|
| **RAW** | Unprocessed sensor data from a camera. Holds far more tonal and colour information than a compressed image; requires a decoder (LibRaw) rather than a standard image library. |
| **HEIC** | High Efficiency Image Container, the default still-image format on iPhones. Needs a dedicated decoder (`heic2any`) in most browsers. |
| **AVIF** | AV1 Image File Format. A modern, highly compressed image format with HDR capability. |
| **WASM** | WebAssembly. A portable binary format that lets compiled C/C++ libraries (e.g. ImageMagick) run in a browser sandbox. |
| **ImageMagick** | Command-line image suite that converts between a very large number of formats, including PSD, EPS, and TIFF. Invoked on the local server. |
| **LibRaw** | Library that decodes camera RAW files into a common pixel representation, including demosaicing. Required for all RAW camera formats. |
| **Ghostscript** | Interpreter for PostScript and PDF. Required to rasterise EPS and PS files. |
| **ZIP** | Standard archive format. In Camerlob it is assembled client-side with JSZip so a 20-file batch downloads as one artefact. |
| **EXIF** | Exchangeable Image File Format — embedded metadata such as camera model, exposure, and orientation. Camerlob does not alter it beyond what the target encoder supports. |
| **Client-side conversion** | Conversion performed entirely in the browser using the Canvas API, `heic2any`, or `magick-wasm`. No image data leaves the device; no server is involved. |
| **Server-side conversion** | Conversion performed by `sharp`, ImageMagick, LibRaw, or Ghostscript on the local Next.js server. Required for RAW, layered, and vector formats. Files travel only to `localhost`. |
| **Two-way conversion** | The guarantee that a supported pair `A → B` is also supported as `B → A` wherever the target can represent the source data. |

---

## 16. Appendix

### A.1 Reference — Original Format List

The authoritative format list originates from a reference image of supported image formats circulated as the source specification for this product. The categorised transcription in [Section 6](#6-supported-formats) is the normative version for v1; the original image is retained as supporting reference material. Any format present in the original list but absent from Section 6 is a defect to be raised against Metric 1 in [Section 13](#13-success-metrics-mvp).

### A.2 Reference — Competitive Tools

| Tool | Model | Difference |
|------|-------|------------|
| **CloudConvert** | Cloud, freemium with quotas | Uploads files to a remote server; free tier is rate-limited; serves ads |
| **Convertio** | Cloud, freemium with quotas | Uploads files; blocks or watermarks free-tier conversions; account needed for bulk work |
| **Squoosh** | Client-side, free | Strong WEBP/AVIF optimiser but limited format set; no RAW, PSD, or vector support; no batch UI |

**Why Camerlob is different.**

- **Coverage.** Where Squoosh handles a handful of web formats, Camerlob spans 40+ formats including RAW camera files and layered/vector professional formats.
- **Privacy.** Where CloudConvert and Convertio upload every image to a remote server, Camerlob processes everything locally and makes zero outbound image requests.
- **No limits.** Cloud converters cap daily conversions and file size on free tiers. Camerlob has no quota and no artificial cap beyond the 20-file batch limit.
- **Self-hostable.** Camerlob is MIT-licensed open source that runs on the user's own machine, so it remains available indefinitely with no vendor dependency.

### A.3 Document Control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | YYYY-MM-DD | Solo Developer | Initial PRD for MVP scope |

---

*End of document.*
