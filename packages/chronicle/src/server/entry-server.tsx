import '@raystack/apsara/normalize.css';
import '@raystack/apsara/style.css';
import React from 'react';
import { renderToReadableStream } from 'react-dom/server.edge';
import { StaticRouter } from 'react-router';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';
import { mdxComponents } from '@/components/mdx';
import { loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';
import { PageProvider } from '@/lib/page-context';
import { getPageTree, getPage, loadPageModule, extractFrontmatter, getRelativePath } from '@/lib/source';
import { App } from './App';

import clientAssets from './entry-client?assets=client';
import serverAssets from './entry-server?assets=ssr';

export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const slug = pathname === '/' ? [] : pathname.slice(1).split('/').filter(Boolean);

    const config = loadConfig();
    const apiSpecs = config.api?.length
      ? await loadApiSpecs(config.api).catch(() => [])
      : [];

    const [tree, page] = await Promise.all([
      getPageTree(),
      getPage(slug),
    ]);

    const relativePath = page ? getRelativePath(page) : null;
    const mdxModule = relativePath ? await loadPageModule(relativePath) : null;

    const pageData = page
      ? {
          slug,
          frontmatter: extractFrontmatter(page, slug[slug.length - 1]),
          content: mdxModule?.default
            ? React.createElement(mdxModule.default, { components: mdxComponents })
            : null,
          toc: mdxModule?.toc ?? [],
        }
      : null;

    const embeddedData = {
      config,
      tree,
      slug,
      frontmatter: pageData?.frontmatter ?? null,
      relativePath,
    };
    const safeJson = JSON.stringify(embeddedData).replace(/</g, '\\u003c');

    const assets = clientAssets.merge(serverAssets);

    const stream = await renderToReadableStream(
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          {assets.css.map((attr: { href: string }) => (
            <link key={attr.href} rel="stylesheet" {...attr} />
          ))}
          {assets.js.map((attr: { href: string }) => (
            <link key={attr.href} rel="modulepreload" {...attr} />
          ))}
          <script type="module" src={assets.entry} />
          <script dangerouslySetInnerHTML={{ __html: `window.__PAGE_DATA__ = ${safeJson}` }} />
        </head>
        <body>
          <div id="root">
            <StaticRouter location={pathname}>
              <ReactRouterProvider>
                <PageProvider
                  initialConfig={config}
                  initialTree={tree}
                  initialPage={pageData}
                  initialApiSpecs={apiSpecs}
                  loadMdx={async () => ({ content: null, toc: [] })}
                >
                  <App />
                </PageProvider>
              </ReactRouterProvider>
            </StaticRouter>
          </div>
        </body>
      </html>,
    );

    const isApiRoute = pathname.startsWith('/apis');
    const status = !page && !isApiRoute && slug.length > 0 ? 404 : 200;

    return new Response(stream, {
      status,
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
  },
};
