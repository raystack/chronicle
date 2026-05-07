# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands use **bun** (not npm/npx/pnpm — blocked by hook).

```bash
# Build CLI (required after any source changes before testing)
bun run build:cli

# Dev server with examples
bun run dev:examples:basic       # paper theme, port 3000
bun run dev:examples:versioned   # versioned docs
bun run dev:docs                 # project docs site

# Build examples
bun run build:examples:basic

# Lint (from packages/chronicle/)
cd packages/chronicle && bunx biome lint src/

# Tests (from packages/chronicle/)
cd packages/chronicle && bun test

# Type check
bunx tsc --noEmit --project packages/chronicle/tsconfig.json
```

**Critical**: CLI runs from `dist/`, not source. Always `bun run build:cli` after changing anything in `src/` before testing with the dev server.

## Architecture

Monorepo: `packages/chronicle` (main package) + `examples/*` (reference sites).

### Request lifecycle

1. **CLI** (`src/cli/`) — Commander.js commands: `init`, `dev`, `build`, `start`, `serve`
2. CLI loads `chronicle.yaml` (Zod-validated in `src/lib/config.ts`), symlinks project content to `.content/`
3. **Vite + Nitro** (`src/server/vite-config.ts`) — dev server and SSR build
4. **SSR handler** (`src/server/entry-server.tsx`) — renders React app per request, injects `__PAGE_DATA__` JSON into HTML
5. **Client hydration** (`src/server/entry-client.tsx`) — hydrates from `__PAGE_DATA__`, handles subsequent navigation client-side

### Content system

- Project content is symlinked to `packages/chronicle/.content/` at dev/build time
- `src/lib/source.ts` uses `import.meta.glob('../../.content/**/*.{mdx,md}')` to build page tree via `fumadocs-core/source` loader
- `readme.mdx` files are treated as `index.mdx`
- Frontmatter fields: `title`, `description`, `order` (sort), `icon`, `lastModified`
- Directory metadata via `meta.json` files; `{ root: true }` creates a content root boundary
- Versioning: `src/lib/version-source.ts` filters tree/pages by version prefix in URL

Remark plugins (configured in `vite-config.ts`): directives, admonitions, image resolution, link resolution, mermaid, reading time.

### Routing

`src/server/App.tsx` is a single component (no React Router `<Route>` elements). It calls `resolveRoute(pathname, config)` from `src/lib/route-resolver.ts` which returns a discriminated union: `DocsPage | DocsIndex | ApiPage | ApiIndex | Redirect`.

`src/lib/page-context.tsx` provides `PageProvider` — holds tree (static after SSR), page (fetched on client nav), API specs, and version context.

### Theme system

Two themes registered in `src/themes/registry.ts`:
- **default** — sidebar + TOC layout
- **paper** — book-style single-column with reading progress

Each theme exports `{ Layout, Page }` conforming to `ThemeLayoutProps` / `ThemePageProps` from `src/types/theme.ts`. Theme is selected via `theme.name` in `chronicle.yaml`.

### API docs

OpenAPI specs declared in `chronicle.yaml` → loaded by `src/lib/openapi.ts` → rendered by components in `src/components/api/`. The API "Try it out" panel uses CodeMirror and a CORS proxy (`src/server/api/apis-proxy.ts`).

### Server API routes

`src/server/api/`: `health`, `page` (metadata), `search` (MiniSearch), `specs` (OpenAPI aggregation), `apis-proxy`.
`src/server/routes/`: `[...slug].md`, `llms.txt`, `robots.txt`, `sitemap.xml`, `og.tsx` (satori).

## Key constraints

- `@raystack/apsara` is the UI component library. For component docs/props, fetch `https://apsara.raystack.org/llms.txt`
- Path alias: `@/*` → `./src/*` (configured in tsconfig + vite)
- CSS: use CSS modules with Apsara design tokens (`--rs-color-*`, `--rs-font-*`, `--rs-space-*`). Use `--rs-color-border-base-primary` (not `--rs-color-border-base`).
- `[data-theme=dark]` via `:global()` for dark mode overrides in CSS modules
- Shiki syntax highlighting needs explicit CSS: `.pre code span { color: var(--shiki-light) }` + dark variant
- `remark-directive` mangles URLs with ports (`:5173`) — `remark-unused-directives` plugin works around this
