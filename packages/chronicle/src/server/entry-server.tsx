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
import { getPage, getPageTree, isDraft, getPageNav, loadPageModule, extractFrontmatter, getRelativePath, getOriginalPath, getPageImages } from '@/lib/source';
import { getFirstApiUrl } from '@/lib/api-routes';
import { StatusCodes } from 'http-status-codes';
import { resolvePageAndSlug, resolveDocsRedirect, compactTree } from '@/lib/tree-utils';
import { filterPageTreeByVersion, filterPageTreeByContentDir } from '@/lib/version-source';
import { getActiveContentDir } from '@/lib/navigation';
import { getLatestContentRoots, getVersionContentRoots } from '@/lib/config';
import { isLocalImage, isSvg, buildOptimizedUrl, DEFAULT_WIDTH } from '@/lib/image-utils';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useNitroApp } from 'nitro/app';
import { App } from './App';

import clientAssets from './entry-client?assets=client';
import serverAssets from './entry-server?assets=ssr';

function errorResponse(status: number, title: string, message: string): Response {
  const safe = message.replace(/[<>&"]/g, '');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${status} — ${title}</title>
</head>
<body>
  <h1>${status} — ${title}</h1>
  <p>${safe}</p>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  });
}

export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = decodeURIComponent(url.pathname);
    try {

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

    const fullTree = await getPageTree();
    const versionTree = filterPageTreeByVersion(fullTree, route.version, config);
    const contentDirs = route.version.dir
      ? getVersionContentRoots(config, route.version.dir)
      : getLatestContentRoots(config);
    const activeDir = getActiveContentDir(pathname, config);
    const scopedTree = contentDirs.length === 1 && activeDir
      ? filterPageTreeByContentDir(versionTree, route.version, activeDir)
      : versionTree;
    const tree = compactTree(scopedTree);

    // SSR redirects for index pages
    if (route.type === RouteType.ApiIndex) {
      const firstUrl = getFirstApiUrl(apiSpecs);
      if (firstUrl) {
        return new Response(null, { status: StatusCodes.TEMPORARY_REDIRECT, headers: { Location: firstUrl } });
      }
    }

    const resolved = route.type === RouteType.DocsPage
      ? await resolvePageAndSlug(route.slug, { getPage, getPageTree, isDraft, config, version: route.version })
      : null;
    const page = resolved?.page ?? null;
    const resolvedSlug = resolved?.slug ?? pageSlug;

    if (route.type === RouteType.DocsPage && resolved && resolved.slug.join('/') !== route.slug.join('/')) {
      return new Response(null, {
        status: StatusCodes.TEMPORARY_REDIRECT,
        headers: { Location: `/${resolved.slug.join('/')}` },
      });
    }

    const nav = page ? await getPageNav(resolvedSlug) : { prev: null, next: null };

    const relativePath = page ? getRelativePath(page) : null;
    const originalPath = page ? getOriginalPath(page) : null;
    const mdxModule = (originalPath || relativePath) ? await loadPageModule(originalPath || relativePath!) : null;
    const pageImages = page ? getPageImages(page) : [];

    const pageData = page
      ? {
          slug: resolvedSlug,
          frontmatter: {
            ...extractFrontmatter(page, resolvedSlug[resolvedSlug.length - 1]),
            _readingTime: mdxModule?._readingTime,
          },
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
      slug: resolvedSlug,
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
          <link rel="icon" href="/favicon.ico" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          {assets.css.map((attr: { href: string }) => (
            <link key={attr.href} rel="stylesheet" {...attr} />
          ))}
          {assets.js.map((attr: { href: string }) => (
            <link key={attr.href} rel="modulepreload" {...attr} />
          ))}
          {[...new Set(pageImages)].map((src: string) => {
            const href = isLocalImage(src) && !isSvg(src) ? buildOptimizedUrl(src, DEFAULT_WIDTH) : src;
            return <link key={src} rel="preload" as="image" href={href} />;
          })}
          {isApiRoute && (
            <link
              rel="preload"
              as="fetch"
              crossOrigin="anonymous"
              href={route.version.dir
                ? `/api/specs?version=${encodeURIComponent(route.version.dir)}`
                : '/api/specs'}
            />
          )}
          <script type="module" src={assets.entry} />
          <script dangerouslySetInnerHTML={{ __html: `window.__PAGE_DATA__ = ${safeJson}` }} />
        </head>
        <body>
          <div id="root">
            <QueryClientProvider client={new QueryClient()}>
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
            </QueryClientProvider>
          </div>
        </body>
      </html>,
    );
    await stream.allReady;

    const renderDuration = performance.now() - renderStart;

    const status = route.type === RouteType.DocsPage && !page ? StatusCodes.NOT_FOUND : StatusCodes.OK;

    // biome-ignore lint/correctness/useHookAtTopLevel: useNitroApp is a Nitro DI accessor, not a React hook
    useNitroApp().hooks.callHook('chronicle:ssr-rendered', pathname, status, renderDuration);

    return new Response(stream, {
      status,
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
    } catch (err) {
      console.error(`[chronicle] SSR error for ${pathname}:`, err);
      if (import.meta.env.DEV) {
        const { renderMdxErrorResponse } = await import('./dev-error-page');
        const mdxError = await renderMdxErrorResponse(err);
        if (mdxError) return mdxError;
      }
      return errorResponse(500, 'Internal Server Error', err instanceof Error ? err.message : String(err));
    }
  },
};
