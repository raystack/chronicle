import path from 'node:path';
import { defineHandler } from 'nitro';
import React from 'react';
import { mdxComponents } from '@/components/mdx';
import { loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';
import { buildPageTree, getPage, loadPageComponent } from '@/lib/source';
import { render } from '../entry-server';
// @ts-expect-error virtual import from Nitro
import clientAssets from '../entry-client?assets=client';
// @ts-expect-error virtual import from Nitro
import serverAssets from '../entry-server?assets=ssr';

export default defineHandler(async event => {
  const pathname = event.url.pathname;
  const slug =
    pathname === '/' ? [] : pathname.slice(1).split('/').filter(Boolean);

  const config = loadConfig();
  const apiSpecs = config.api?.length
    ? await loadApiSpecs(config.api).catch(() => [])
    : [];

  const [tree, sourcePage] = await Promise.all([
    buildPageTree(),
    getPage(slug)
  ]);

  let pageData = null;
  const embeddedData: Record<string, unknown> = {
    config,
    tree,
    slug,
    frontmatter: null,
    relativePath: null
  };

  if (sourcePage) {
    const component = await loadPageComponent(sourcePage);
    pageData = {
      slug,
      frontmatter: sourcePage.frontmatter,
      content: component
        ? React.createElement(component, { components: mdxComponents })
        : null
    };
    embeddedData.frontmatter = sourcePage.frontmatter;
    embeddedData.relativePath = path.relative(__CHRONICLE_CONTENT_DIR__, sourcePage.filePath);
  }

  const appHtml = await render(event.url.href, { config, tree, page: pageData, apiSpecs });

  const assets = clientAssets.merge(serverAssets);
  const cssLinks = assets.css.map((attr: { href: string }) =>
    `<link rel="stylesheet" href="${attr.href}" />`
  ).join('\n    ');
  const jsPreloads = assets.js.map((attr: { href: string }) =>
    `<link rel="modulepreload" href="${attr.href}" />`
  ).join('\n    ');

  const safeJson = JSON.stringify(embeddedData).replace(/</g, '\\u003c');
  const dataScript = `<script>window.__PAGE_DATA__ = ${safeJson}</script>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${cssLinks}
    ${jsPreloads}
    ${dataScript}
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script type="module" src="${assets.entry}"></script>
  </body>
</html>`;

  event.res.headers.set('Content-Type', 'text/html');
  return html;
});
