import '@vitejs/plugin-react/preamble';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';
import { mdxComponents } from '@/components/mdx';
import { getApiConfigsForVersion } from '@/lib/config';
import { PageProvider } from '@/lib/page-context';
import { resolveRoute, RouteType } from '@/lib/route-resolver';
import { LATEST_CONTEXT, type VersionContext } from '@/lib/version-source';
import type { ChronicleConfig, Frontmatter, Root, TableOfContents } from '@/types';
import type { ApiSpec } from '@/lib/openapi';
import type { ReactNode } from 'react';
import { App } from './App';

interface EmbeddedData {
  config: ChronicleConfig;
  tree: Root;
  slug: string[];
  version: VersionContext;
  frontmatter: Frontmatter;
  relativePath: string;
  originalPath?: string;
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

    const config: ChronicleConfig = embedded?.config ?? defaultConfig;
    const tree: Root = embedded?.tree ?? { name: 'root', children: [] };
    const version: VersionContext = embedded?.version ?? LATEST_CONTEXT;

    const route = resolveRoute(window.location.pathname, config);
    const isApiRoute =
      route.type === RouteType.ApiIndex || route.type === RouteType.ApiPage;
    const apiConfigs = isApiRoute
      ? getApiConfigsForVersion(config, version.dir)
      : [];
    const specsUrl = version.dir
      ? `/api/specs?version=${encodeURIComponent(version.dir)}`
      : '/api/specs';
    const apiSpecs: ApiSpec[] = apiConfigs.length
      ? await fetch(specsUrl)
          .then(r => r.json())
          .catch(() => [])
      : [];

    const mdxPath = embedded?.originalPath || embedded?.relativePath;
    const page = mdxPath
      ? {
          slug: embedded!.slug,
          frontmatter: embedded!.frontmatter,
          ...(await loadMdxModule(mdxPath)),
        }
      : null;

    hydrateRoot(
      document.getElementById('root') as HTMLElement,
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
    );
  } catch (err) {
    console.error('Hydration failed:', err);
  }
}

hydrate();
