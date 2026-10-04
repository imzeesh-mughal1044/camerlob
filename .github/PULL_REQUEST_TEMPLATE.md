## Description

<!-- What does this pull request change, and why? Link the issue it closes. -->

Closes #

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New format or new engine
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Refactor or internal cleanup (no behaviour change)
- [ ] Documentation only
- [ ] Build, CI or tooling

## Checklist

- [ ] `pnpm run lint` passes
- [ ] `pnpm run typecheck` passes under `strict: true`
- [ ] `pnpm run format:check` passes (run `pnpm run format` if it does not)
- [ ] `pnpm test` passes; new logic has unit tests in `tests/unit/`
- [ ] `pnpm run test:e2e` passes for any user-facing flow change
- [ ] Keyboard navigation works and focus is visible
- [ ] `prefers-reduced-motion` is respected for any new animation
- [ ] No new hardcoded colour, limit, format identifier or user-facing string;
      all of it comes from `styles/tokens.css` or `lib/constants/`
- [ ] `.env.example` updated if a new environment variable was introduced
- [ ] `CHANGELOG.md` updated under `Unreleased` if this is user-visible
- [ ] `Documents/PRD.md`, `Documents/TRD.md` or `Documents/UI-UX-BRIEF.md` updated
      if scope, behaviour or design changed

## Screenshots

<!-- Required for any visual change. Before and after, light and dark. -->

| Before | After |
| ------ | ----- |
|  |  |

## Testing notes

<!-- How did you verify this? Which engines, formats and browsers did you exercise? -->

## Risks and rollback

<!-- What could break, and how would you revert it? -->
