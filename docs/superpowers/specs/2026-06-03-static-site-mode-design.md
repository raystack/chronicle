# Static Site Mode for Chronicle

## Overview

A `--preset static` build mode that produces a fully self-contained SPA deployable to any static host (GitHub Pages, S3, Netlify, Cloudflare Pages). No server, no SSR, no database.

## Build Pipeline

```
chronicle build --preset static
        │
        ▼
┌──────────────────────┐
│  Phase 1: Vite Build  │  ← builds client JS/CSS bundle
│  (client bundle only) │
└──────────┬───────────┘
           ▼
┌───────────────────────────┐
│  Phase 2: Static Generate  │
│                            │
│  ├─ SPA index.html shell   │
│  ├─ /data/pages/*.json     │  ← replaces /api/page
│  ├─ /data/search.json      │  ← replaces /api/search
│  ├─ /data/specs/*.json     │  ← replaces /api/specs
│  ├─ /sitemap.xml           │
│  ├─ /robots.txt            │
│  ├─ /llms.txt              │
│  ├─ /og/*.png              │  ← pre-generated OG images
│  └─ /_content/**           │  ← optimized images (webp)
└────────────────────────────┘
```

## Component Changes

### 1. Static generator — `src/cli/commands/static-generate.ts` (new)

Runs after Vite client build. Loads config + content via `source.ts` / `config.ts`. Generates:

- **Page metadata JSON**: One file per page at `data/pages/<slug>.json`. Keyed by comma-separated slug (same format as existing `/api/page?slug=` query param). Contains `{ frontmatter, relativePath, originalPath, images, prev, next }`.
- **Search index**: `data/search.json` — array of `{ id, url, title, headings, body, type, section }`. Same shape as `build-search-index.ts` but includes full body text.
- **API specs**: `data/specs/<version>.json` — serialized `ApiSpec[]` per version. `data/specs/latest.json` for the default.
- **Static routes**: sitemap.xml, robots.txt, llms.txt — same logic as current route handlers, written to files.
- **OG images**: Per page, Satori SVG → Sharp PNG. Written to `og/<slug>.png`.
- **Image optimization**: Walk all page images, convert to webp via Sharp at default width/quality.

### 2. SPA shell — `index.html`

Minimal HTML that:
- Loads the Vite client bundle (JS + CSS)
- Embeds config and full page tree as `window.__PAGE_DATA__` (tree only, no per-page content)
- Sets `window.__STATIC_MODE__ = true`
- Client router resolves routes and fetches page JSON on navigation

### 3. Client entry — `src/server/entry-static.tsx` (new)

New entry point for static builds:
- Uses `createRoot` + `render` (no hydration, no `hydrateRoot`)
- On route change, fetches `/data/pages/<slug>.json` instead of `/api/page`
- Loads MDX modules from the bundle via `import.meta.glob`
- Embeds MiniSearch for search

### 4. Page context — `src/lib/page-context.tsx`

When `window.__STATIC_MODE__` is true:
- `fetchPageData` reads from `/data/pages/<slug>.json`
- `fetchApiSpecs` reads from `/data/specs/<version>.json`
- No `/api/*` calls

### 5. Search — `src/components/ui/search.tsx`

When static mode:
- On first search dialog open, fetch `/data/search.json` and build MiniSearch index in memory
- Query locally, return same result shape
- Same UI, different data source

### 6. API playground — `src/components/api/playground-dialog.tsx`

When static mode:
- Construct full URL from `spec.server.url` + operation path
- Send request directly via `fetch()` with user's auth headers
- No proxy — browser talks to API server directly
- API server must have CORS configured for the docs origin
- Show helpful error message on CORS failures

### 7. Build command — `src/cli/commands/build.ts`

When `isStaticPreset(preset)`:
- Run Vite client build only (skip Nitro server build)
- Run static generation phase
- Output to `.output/public/`
- Skip database config, telemetry

### 8. Vite config — `src/server/vite-config.ts`

When static preset:
- Use `entry-static.tsx` as client entry
- Add MiniSearch to bundle dependencies
- Skip Nitro server build
- No database/storage config

### 9. Image handling

`remark-resolve-images` already disables `/api/image` rewriting for static presets — images stay as `/_content/...` paths. The static generator optimizes them with Sharp and writes to the output's `_content/` directory.

## Output Structure

```
.output/public/
├── index.html
├── assets/                         (Vite bundle)
├── data/
│   ├── pages/
│   │   ├── docs,getting-started.json
│   │   └── ...
│   ├── search.json
│   └── specs/
│       └── latest.json
├── _content/                       (optimized images)
├── og/
│   ├── docs,getting-started.png
│   └── ...
├── sitemap.xml
├── robots.txt
└── llms.txt
```

## What stays the same

- MDX content bundled via `import.meta.glob`
- Route resolution (`route-resolver.ts`) — pure function
- Theme system, MDX components, page tree building
- All existing SSR/server behavior when not using static preset

## API playground: proxy vs direct

| Deployment | Playground behavior |
|------------|-------------------|
| Server (default, vercel, bun, etc.) | Requests go through `/api/apis-proxy` (existing) |
| Static (static, github-pages, etc.) | Browser sends requests directly to API server |

## Verification

Playwright tests against the `basic` example built with `--preset static`, served via a simple HTTP server:

1. Page renders correct content
2. Client-side navigation (sidebar clicks)
3. Search returns results (client-side MiniSearch)
4. API docs page renders operations
5. API playground opens, shows direct-request mode
6. OG meta tags present with correct image paths
7. Images load (webp optimized)
8. 404 handling for unknown routes
9. Version switching (versioned example)
