---
name: Bug report
about: Something in Camerlob does not work as documented
title: '[Bug] '
labels: bug
assignees: ''
---

## Summary

<!-- One sentence. What is broken? -->

## Steps to reproduce

1.
2.
3.

## Expected behaviour

<!-- What should have happened? -->

## Actual behaviour

<!-- What happened instead? Include the exact error text or toast wording. -->

## Conversion details

<!-- Native-engine bugs are almost always format-pair specific. -->

- **Source format(s)**:
- **Target format**:
- **File count in batch**:
- **Approximate file size(s)**:
- **Client or server engine**: client / server / unknown

## Environment

<!-- Paste the output of `pnpm check-engines`; it names every missing binary. -->

- **Camerlob version**:
- **Commit SHA**:
- **OS**: macOS / Windows / Linux (WSL) / Docker — with version
- **Node version** (`node -v`):
- **pnpm version** (`pnpm -v`):
- **Browser** and version:
- **Running via**: `pnpm dev` / `pnpm build && pnpm start` / Docker / Vercel

```
$ pnpm check-engines
<paste output here>
```

## Console output

<!-- Developer logs are the only diagnostic surface in v1: there is no telemetry. -->

```
<paste browser console output, prefixed [camerlob] lines included>
```

## Screenshots or recordings

<!-- Required for any visual regression. -->

## Additional context

<!-- Anything else: network tab entries, a minimal reproduction repository, etc. -->
