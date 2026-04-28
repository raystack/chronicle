import '@raystack/apsara/normalize.css';
import '@raystack/apsara/style.css';
import React from 'react';
import { renderToReadableStream } from 'react-dom/server.edge';
import { StaticRouter } from 'react-router';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';
import { mdxComponents } from '@/components/mdx';
import { getApiConfigsForVersion, loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';
import { PageProvider } from '@/lib/page-context';
import { resolveRoute, RouteType } from '@/lib/route-resolver';
import { getPageTree, getPage, getPageNav, loadPageModule, extractFrontmatter, getRelativePath, getOriginalPath } from '@/lib/source';
import { useNitroApp } from 'nitro/app';
import { App } from './App';

import clientAssets from './entry-client?assets=client';
import serverAssets from './entry-server?assets=ssr';

export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    const config = loadConfig();
    const route = resolveRoute(pathname, config);

    if (route.type === RouteType.Redirect) {
      // biome-ignore lint/correctness/useHookAtTopLevel: useNitroApp is a Nitro DI accessor, not a React hook
      useNitroApp().hooks.callHook('chronicle:ssr-rendered', pathname, route.status, 0);
      return new Response(null, {
        status: route.status,
        headers: { Location: route.to },
      });
    }

    const isApiRoute = route.type === RouteType.ApiIndex || route.type === RouteType.ApiPage;
    const pageSlug = route.type === RouteType.DocsPage ? route.slug : [];

    const apiConfigs = isApiRoute
      ? getApiConfigsForVersion(config, route.version.dir)
      : [];
    const apiSpecs = apiConfigs.length ? await loadApiSpecs(apiConfigs) : [];

    const [tree, page] = await Promise.all([
      getPageTree(),
      route.type === RouteType.DocsPage ? getPage(route.slug) : Promise.resolve(null),
    ]);
    const nav = page ? await getPageNav(pageSlug, tree) : { prev: null, next: null };

    const relativePath = page ? getRelativePath(page) : null;
    const originalPath = page ? getOriginalPath(page) : null;
    const mdxModule = (originalPath || relativePath) ? await loadPageModule(originalPath || relativePath!) : null;

    const pageData = page
      ? {
          slug: pageSlug,
          frontmatter: extractFrontmatter(page, pageSlug[pageSlug.length - 1]),
          content: mdxModule?.default
            ? React.createElement(mdxModule.default, { components: mdxComponents })
            : null,
          toc: mdxModule?.toc ?? [],
          prev: nav.prev,
          next: nav.next,
        }
      : null;

    const embeddedData = {
      config,
      tree,
      slug: pageSlug,
      version: route.version,
      frontmatter: pageData?.frontmatter ?? null,
      relativePath,
      originalPath,
      prev: pageData?.prev ?? null,
      next: pageData?.next ?? null,
    };
    const safeJson = JSON.stringify(embeddedData).replace(/</g, '\\u003c');

    const assets = clientAssets.merge(serverAssets);

    const renderStart = performance.now();
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
                  initialVersion={route.version}
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

    const renderDuration = performance.now() - renderStart;

    const status = route.type === RouteType.DocsPage && !page ? 404 : 200;

    // biome-ignore lint/correctness/useHookAtTopLevel: useNitroApp is a Nitro DI accessor, not a React hook
    useNitroApp().hooks.callHook('chronicle:ssr-rendered', pathname, status, renderDuration);

    return new Response(stream, {
      status,
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
  },
};
