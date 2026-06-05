import '@vitejs/plugin-react/preamble';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { mdxComponents } from '@/components/mdx';
import { getApiConfigsForVersion } from '@/lib/config';
import { PageProvider } from '@/lib/page-context';
import { queryClient } from '@/lib/preload';
import { resolveRoute, resolveContentRootRedirect, RouteType } from '@/lib/route-resolver';
import { pageDataUrl, specsUrl } from '@/lib/data-urls';
import { resolveVersionFromUrl, type VersionContext } from '@/lib/version-source';
import type { ChronicleConfig, Frontmatter, PageNavLink, Root, TableOfContents } from '@/types';
import type { ApiSpec } from '@/lib/openapi';
import type { ReactNode } from 'react';
import { App } from './App';

interface StaticEmbeddedData {
  config: ChronicleConfig;
  tree: Root;
  version: VersionContext;
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

async function fetchStaticPageData(slug: string[]) {
  const res = await fetch(pageDataUrl(slug));
  if (!res.ok) throw new Error(String(res.status));
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('json')) throw new Error('404');
  return res.json();
}

async function fetchStaticApiSpecs(version: VersionContext): Promise<ApiSpec[]> {
  try {
    const res = await fetch(specsUrl(version.dir));
    if (!res.ok) return [];
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('json')) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function mount() {
  try {
    const embedded = (
      window as unknown as { __PAGE_DATA__?: StaticEmbeddedData }
    ).__PAGE_DATA__;

    const config: ChronicleConfig = embedded?.config ?? defaultConfig;
    const tree: Root = embedded?.tree ?? { name: 'root', children: [] };

    const route = resolveRoute(window.location.pathname, config);

    if (route.type === RouteType.Redirect) {
      window.location.replace(route.to);
      return;
    }

    if (route.type === RouteType.DocsPage) {
      const redirect = resolveContentRootRedirect(route.slug, config);
      if (redirect) {
        window.location.replace(redirect);
        return;
      }
    }

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
    const apiSpecs: ApiSpec[] = apiConfigs.length
      ? await fetchStaticApiSpecs(routeVersion)
      : [];

    let page = null;
    if (route.type === RouteType.DocsPage) {
      try {
        const data = await fetchStaticPageData(route.slug);
        const mdxPath = data.originalPath || data.relativePath;
        if (mdxPath && data.frontmatter) {
          const { content, toc } = await loadMdxModule(mdxPath);
          page = {
            slug: route.slug,
            frontmatter: data.frontmatter as Frontmatter,
            prev: (data.prev as PageNavLink) ?? null,
            next: (data.next as PageNavLink) ?? null,
            content,
            toc,
          };
        }
      } catch {
        // page will remain null, context will show 404
      }
    }

    createRoot(document.getElementById('root')!).render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReactRouterProvider>
            <PageProvider
              initialConfig={config}
              initialTree={tree}
              initialPage={page}
              initialApiSpecs={apiSpecs}
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
    console.error('Static mount failed:', err);
  }
}

mount();
