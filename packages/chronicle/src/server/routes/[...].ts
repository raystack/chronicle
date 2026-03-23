import { defineHandler } from 'nitro';
import React from 'react';
import { mdxComponents } from '@/components/mdx';
import { loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';
import { buildPageTree, getPage, loadPageComponent } from '@/lib/source';
import { render } from '../entry-server';

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
    filePath: null
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
    embeddedData.filePath = sourcePage.filePath;
  }

  const appHtml = await render(event.url.href, { config, tree, page: pageData, apiSpecs });

  const safeJson = JSON.stringify(embeddedData).replace(/</g, '\\u003c');
  const dataScript = `<script>window.__PAGE_DATA__ = ${safeJson}</script>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${dataScript}
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script type="module" src="/src/server/entry-client.tsx"></script>
  </body>
</html>`;

  event.res.headers.set('Content-Type', 'text/html');
  return html;
});
