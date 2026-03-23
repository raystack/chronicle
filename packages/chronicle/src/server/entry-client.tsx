import '@vitejs/plugin-react/preamble';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';
import { mdxComponents } from '@/components/mdx';
import { PageProvider } from '@/lib/page-context';
import type { ChronicleConfig, Frontmatter, PageTree } from '@/types';
import type { ApiSpec } from '@/lib/openapi';
import type { ReactNode } from 'react';
import { App } from './App';

interface EmbeddedData {
  config: ChronicleConfig;
  tree: PageTree;
  slug: string[];
  frontmatter: Frontmatter;
  relativePath: string;
}

async function hydrate() {
  try {
    const embedded = (
      window as unknown as { __PAGE_DATA__?: EmbeddedData }
    ).__PAGE_DATA__;

    const config: ChronicleConfig = embedded?.config ?? {
      title: 'Documentation'
    };
    const tree: PageTree = embedded?.tree ?? { name: 'root', children: [] };
    const isApiPage =
      window.location.pathname.startsWith('/apis') && !!config.api?.length;
    const apiSpecs: ApiSpec[] = isApiPage
      ? await fetch('/api/specs')
          .then(r => r.json())
          .catch(() => [])
      : [];

    const page = embedded?.relativePath
      ? await loadPage(embedded)
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

async function loadPage(
  embedded: EmbeddedData
): Promise<{ slug: string[]; frontmatter: Frontmatter; content: ReactNode }> {
  const withoutExt = embedded.relativePath.replace(/\.(mdx|md)$/, '');
  const mod = embedded.relativePath.endsWith('.md')
    ? await import(`../../.content/${withoutExt}.md`)
    : await import(`../../.content/${withoutExt}.mdx`);
  const content = mod.default
    ? React.createElement(mod.default, { components: mdxComponents })
    : null;
  return { slug: embedded.slug, frontmatter: embedded.frontmatter, content };
}

hydrate();
