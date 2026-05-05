# Repository Guidelines — conoha-wallpaper-scraper

TypeScript scraper that pulls Conoha wallpaper assets and bundles them.

> Agent configuration is managed via [apm](https://github.com/microsoft/apm).
> Common conventions live in `mazrean/apm-plackage/common`; frontend rules come
> from `mazrean/apm-plackage/frontend`. Run `apm install` to materialise locally.

## Build & Test

- `npm install`
- `npm run build` — bundle via `build.ts`
- `npm test` — if/when tests are added

## Conventions

- Uses `npm` (not pnpm). No frontend framework — plain TS / Node.
- Playwright is not currently used; if E2E coverage is added, use the Playwright CLI + `playwright-cli` skill (no MCP).
- Specs go under `specs/`; use `mazrean/agent-skills/skills/writing-*`.
- Commit using Conventional Commits (`committing-code` skill).
