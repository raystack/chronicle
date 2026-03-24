import '@vitejs/plugin-react/preamble';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';
import { loadMdxModule } from '@/lib/mdx-loader';
import { PageProvider } from '@/lib/page-context';
import type { ChronicleConfig, Frontmatter, Root } from '@/types';
import type { ApiSpec } from '@/lib/openapi';
import { App } from './App';

interface EmbeddedData {
  config: ChronicleConfig;
  tree: Root;
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
    const tree: Root = embedded?.tree ?? { name: 'root', children: [] };
    const isApiPage =
      window.location.pathname.startsWith('/apis') && !!config.api?.length;
    const apiSpecs: ApiSpec[] = isApiPage
      ? await fetch('/api/specs')
          .then(r => r.json())
          .catch(() => [])
      : [];

    const page = embedded?.relativePath
      ? {
          slug: embedded.slug,
          frontmatter: embedded.frontmatter,
          ...(await loadMdxModule(embedded.relativePath)),
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
