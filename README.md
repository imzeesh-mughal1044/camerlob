# Camerlob

**Local-first, unlimited, free image format converter.**

Camerlob converts images in your browser. Files are processed on your own machine
or on your own server — no account, no upload quota, no watermarks, no paywall.

## Features

- Batch conversion with a live queue and per-file progress
- RAW and camera formats via ImageMagick / LibRaw / Ghostscript
- HEIC and other mobile formats via `heic2any`
- Format matrix documented in [Documents/FORMAT-MATRIX.md](Documents/FORMAT-MATRIX.md)
- Deployable as a self-hosted Next.js app (Dockerfile and `docker-compose.yml` included)

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Zustand · Vitest · Playwright

## Requirements

- Node.js >= 20 (see `.nvmrc`)
- pnpm 9 (`corepack enable`)

## Quick start

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

For native format support, install the conversion engines first — see
[Documents/ENGINE-INSTALL.md](Documents/ENGINE-INSTALL.md).

## Configuration

Copy the example environment file and adjust as needed:

```bash
cp .env.example .env.local
```

`.env.local` is gitignored and must never be committed. Variables prefixed with
`NEXT_PUBLIC_` are inlined into the browser bundle and must be safe to expose;
everything else stays server-side.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm lint` | ESLint via `next lint` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm verify` | typecheck + lint + format:check + test |
| `pnpm check-engines` | Verify native conversion engines are present |

## Documentation

Full documentation lives in [`Documents/`](Documents/):

- [PRD.md](Documents/PRD.md) — product requirements
- [UI-UX-BRIEF.md](Documents/UI-UX-BRIEF.md) — UI/UX brief
- [TRD.md](Documents/TRD.md) — technical requirements
- [FOLDER-ARCHITECTURE.md](Documents/FOLDER-ARCHITECTURE.md) — directory layout
- [BACKEND-ARCHITECTURE.md](Documents/BACKEND-ARCHITECTURE.md) — server pipeline
- [API-REFERENCE.md](Documents/API-REFERENCE.md) — HTTP endpoints
- [FORMAT-MATRIX.md](Documents/FORMAT-MATRIX.md) — supported input/output formats
- [ENGINE-INSTALL.md](Documents/ENGINE-INSTALL.md) — native engine setup
- [ERROR-CODES.md](Documents/ERROR-CODES.md) — error taxonomy

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). By participating you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please do not report vulnerabilities in public issues. See
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Zeeshan Ahmad / ZEFANEX Technologies
