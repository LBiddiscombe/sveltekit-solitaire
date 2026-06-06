# sveltekit-solitaire

Fresh SvelteKit 5 scaffold (runes mode forced via `svelte.config.js` runes callback).
No custom application code yet — only `sv` boilerplate.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | `svelte-kit sync` + `svelte-check` (typecheck) |
| `npm run lint` | `prettier --check . && eslint .` |
| `npm run format` | `prettier --write .` |
| `npm run test:unit` | Vitest (watch mode — add `-- --run` for single run) |
| `npm run test:e2e` | `playwright install && playwright test` |
| `npm test` | Unit (single run) + e2e |

## Testing

- **Server tests**: `src/**/*.{test,spec}.{js,ts}` — Vitest, `node` environment
- **Component tests**: `src/**/*.svelte.{test,spec}.{js,ts}` — `vitest-browser-svelte` + Playwright, Chromium headless
- **E2E tests**: `**/*.e2e.{ts,js}` — Playwright, served via `build && preview` on `:4173`
- `expect.requireAssertions: true` — every test must have at least one assertion
- Vitest projects defined inline in `vite.config.ts`; no separate vitest config file

## Conventions

- **Prettier**: tabs, single quotes, no trailing commas, print width 100, `prettier-plugin-tailwindcss` (stylesheet at `src/routes/layout.css`)
- **ESLint**: flat config, `typescript-eslint` (recommended), `eslint-plugin-svelte` (recommended), `eslint-config-prettier` (last)
- **Tailwind CSS 4**: loaded via `@tailwindcss/vite` Vite plugin; entrypoint is `@import 'tailwindcss'` in `src/routes/layout.css`
- **`.npmrc`**: `engine-strict=true`

## Setup quirks

- After changing route structure, run `svelte-kit sync` (or `npm run prepare`) to regenerate `.svelte-kit/` TypeScript types
- The `$lib` alias resolves to `src/lib/`; `$lib/server/` is an exclusion boundary for client-test imports (convention, create directory only when needed)
- `@sveltejs/opencode` plugin provides Svelte MCP server tools (docs lookup, code autofix, playground)
