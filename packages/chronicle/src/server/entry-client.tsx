import '@vitejs/plugin-react/preamble';
// Apsara CSS is imported in the entry (not App.tsx) so it lands only in the
// entry chunk's CSS, which links FIRST — theme CSS must cascade over it.
// Importing it from App.tsx bundled a duplicate copy into the shared index
// chunk, which links last and overrode theme styles.
import '@raystack/apsara/normalize.css';
import '@raystack/apsara/style.css';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { mdxComponents } from '@/components/mdx';
import { getApiConfigsForVersion } from '@/lib/config';
import { PageProvider } from '@/lib/page-context';
import { prefetchSearchSuggestions, queryClient } from '@/lib/preload';
import type { AuthorIndex } from '@/lib/author-index';
import { resolveRoute, RouteType } from '@/lib/route-resolver';
import { resolveVersionFromUrl, type VersionContext } from '@/lib/version-source';
import type { ChronicleConfig, Frontmatter, PageNavLink, Root, TableOfContents } from '@/types';
import type { ApiSpec } from '@/lib/openapi';
import type { ReactNode } from 'react';
import { App } from './App';

interface EmbeddedData {
  config: ChronicleConfig;
  tree: Root;
  slug: string[];
  version: VersionContext;
  frontmatter: Frontmatter | null;
  relativePath: string | null;
  originalPath: string | null;
  prev: PageNavLink | null;
  next: PageNavLink | null;
  /** Only embedded for /authors routes. */
  authorIndex?: AuthorIndex | null;
}

const defaultConfig: ChronicleConfig = {
  site: { title: 'Documentation' },
  content: [{ dir: 'docs', label: 'Docs' }],
};

const contentModules = import.meta.glob<{ default?: React.ComponentType<any>; toc?: TableOfContents }>(
  '../../.content/**/*.{mdx,md}'
);

async function loadMdxModule(relativePath: string): Promise<{ content: ReactNode; toc: TableOfContents }> {
  const withoutExt = relativePath.replace(/\.(mdx|md)$/, '');
  const key = relativePath.endsWith('.md')
    ? `../../.content/${withoutExt}.md`
    : `../../.content/${withoutExt}.mdx`;
  const loader = contentModules[key];
  if (!loader) return { content: null, toc: [] };
  const mod = await loader();
  const content = mod.default
    ? React.createElement(mod.default, { components: mdxComponents })
    : null;
  return { content, toc: mod.toc ?? [] };
}

async function hydrate() {
  try {
    const embedded = (
      window as unknown as { __PAGE_DATA__?: EmbeddedData }
    ).__PAGE_DATA__;

    prefetchSearchSuggestions();
    const config: ChronicleConfig = embedded?.config ?? defaultConfig;
    const tree: Root = embedded?.tree ?? { name: 'root', children: [] };

    const route = resolveRoute(window.location.pathname, config);
    // resolveVersionFromUrl always returns a valid context — even for redirect
    // targets (e.g. /v1 -> /v1/docs) where route.version isn't on the union.
    const routeVersion: VersionContext = resolveVersionFromUrl(
      window.location.pathname,
      config,
    );
    const version: VersionContext = embedded?.version ?? routeVersion;

    const isApiRoute =
      route.type === RouteType.ApiIndex || route.type === RouteType.ApiPage;
    const apiConfigs = isApiRoute
      ? getApiConfigsForVersion(config, routeVersion.dir)
      : [];
    const specsUrl = routeVersion.dir
      ? `/api/specs?version=${encodeURIComponent(routeVersion.dir)}`
      : '/api/specs';
    const apiSpecs: ApiSpec[] = apiConfigs.length
      ? await fetch(specsUrl)
          .then(r => r.json())
          .catch(() => [])
      : [];

    const mdxPath = embedded?.originalPath || embedded?.relativePath;
    const page = embedded && mdxPath && embedded.frontmatter
      ? {
          slug: embedded.slug,
          frontmatter: embedded.frontmatter,
          prev: embedded.prev,
          next: embedded.next,
          ...(await loadMdxModule(mdxPath)),
        }
      : null;

    hydrateRoot(
      document.getElementById('root') as HTMLElement,
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReactRouterProvider>
            <PageProvider
              initialConfig={config}
              initialTree={tree}
              initialPage={page}
              initialApiSpecs={apiSpecs}
              initialAuthorIndex={embedded?.authorIndex ?? null}
              initialVersion={version}
              loadMdx={loadMdxModule}
            >
              <App />
            </PageProvider>
          </ReactRouterProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  } catch (err) {
    console.error('Hydration failed:', err);
  }
}

hydrate();
