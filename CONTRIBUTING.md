# Contributing to Camerlob

Thanks for taking the time to contribute. This document covers the workflow and
conventions the project expects.

## Getting set up

```bash
corepack enable          # pnpm is pinned via packageManager in package.json
pnpm install
pnpm check-engines       # optional: native conversion engines
pnpm dev
```

Node.js >= 20 is required (`.nvmrc`). Copy `.env.example` to `.env.local` for
local configuration — never commit `.env.local`.

## Making a change

1. **Fork** the repository on GitHub.
2. **Clone** your fork and create a branch off `main`.
3. **Make** your change, keeping commits focused and small.
4. **Verify** the tree is clean (below).
5. **Push** to your fork and open a pull request against `main`.

## Branch naming

Use a short, descriptive, slash-delimited name:

| Prefix | Use for |
| --- | --- |
| `feat/` | New user-visible capability |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `chore/` | Tooling, dependencies, config, housekeeping |

Examples: `feat/raw-heic-support`, `fix/drag-drop-order`, `docs/format-matrix`.

## Commit convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and
are validated by commitlint (a commit will fail fast locally via Husky).

```
<type>(<optional scope>): <subject>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

The subject line is imperative, lowercase, and has no trailing period.

```
feat(converter): add WebP lossless toggle
fix(upload): reject files exceeding SERVER_MAX_FILE_SIZE_MB
docs(readme): document engine install path
```

## Testing requirement

Every pull request must pass the verification suite locally before review:

```bash
pnpm typecheck && pnpm lint
```

Run the full gate — typecheck, lint, format check, and unit tests — with:

```bash
pnpm verify
```

Add or update tests alongside behaviour changes. New logic in `lib/` or `hooks/`
should have unit coverage in `tests/unit/`; new HTTP behaviour should have a
spec in `tests/integration/`.

## Pull request checklist

- [ ] Branch name follows `feat/`, `fix/`, `docs/`, or `chore/`
- [ ] Commits follow Conventional Commits and pass commitlint
- [ ] `pnpm typecheck && pnpm lint` passes with no new warnings
- [ ] `pnpm verify` passes
- [ ] Tests added or updated for changed behaviour
- [ ] `pnpm format:check` passes (Prettier is enforced via lint-staged)
- [ ] Documentation updated in `Documents/` if behaviour or formats changed
- [ ] No secrets, `.env.local`, or build output committed
- [ ] PR description explains *what* changed and *why*

## Code style

Do not reformat unrelated code. Run `pnpm format` to apply Prettier to files you
touched. Match the conventions already present in the file you are editing.

## Reporting bugs

Open an issue with the format matrix entry, the source file, the target format,
your OS, and the error code from [Documents/ERROR-CODES.md](Documents/ERROR-CODES.md).
If it may be a security issue, follow [SECURITY.md](SECURITY.md) instead.

## Code of Conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
