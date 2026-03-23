import { PassThrough } from 'node:stream';
import type { ReactNode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import type { ApiSpec } from '@/lib/openapi';
import { PageProvider } from '@/lib/page-context';
import type { ChronicleConfig, Frontmatter, PageTree } from '@/types';
import { App } from './App';

export interface SSRData {
  config: ChronicleConfig;
  tree: PageTree;
  page: {
    slug: string[];
    frontmatter: Frontmatter;
    content: ReactNode;
  } | null;
  apiSpecs: ApiSpec[];
}

export function render(url: string, data: SSRData): Promise<string> {
  const pathname = new URL(url, 'http://localhost').pathname;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(
      <StaticRouter location={pathname}>
        <PageProvider
          initialConfig={data.config}
          initialTree={data.tree}
          initialPage={data.page}
          initialApiSpecs={data.apiSpecs}
        >
          <App />
        </PageProvider>
      </StaticRouter>,
      {
        onAllReady() {
          const passthrough = new PassThrough();
          passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
          passthrough.on('end', () => resolve(Buffer.concat(chunks).toString()));
          passthrough.on('error', reject);
          pipe(passthrough);
        },
        onError: reject,
      }
    );
  });
}
