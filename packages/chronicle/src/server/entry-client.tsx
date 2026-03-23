import '@vitejs/plugin-react/preamble';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { PageProvider } from '@/lib/page-context';
import type { ChronicleConfig, Frontmatter, PageTree } from '@/types';
import type { ApiSpec } from '@/lib/openapi';
import { App } from './App';

interface EmbeddedData {
  config: ChronicleConfig;
  tree: PageTree;
  slug: string[];
  frontmatter: Frontmatter;
  contentHtml: string;
}

// Capture SSR content before hydration
const ssrContentHtml =
  document.querySelector('[data-article-content]')?.innerHTML ?? '';

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

    const page = embedded?.frontmatter
      ? {
          slug: embedded.slug,
          frontmatter: embedded.frontmatter,
          content: <div dangerouslySetInnerHTML={{ __html: embedded.contentHtml || ssrContentHtml }} />,
        }
      : null;

    hydrateRoot(
      document.getElementById('root') as HTMLElement,
      <BrowserRouter>
        <PageProvider
          initialConfig={config}
          initialTree={tree}
          initialPage={page}
          initialApiSpecs={apiSpecs}
        >
          <App />
        </PageProvider>
      </BrowserRouter>
    );
  } catch (err) {
    console.error('Hydration failed:', err);
  }
}

hydrate();
