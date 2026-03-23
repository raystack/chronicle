import React from 'react';
import { defineHandler, HTTPError } from 'nitro';
import { mdxComponents } from '@/components/mdx';
import { getPage, loadPageComponent } from '@/lib/source';
import { renderToHtml } from '../../utils/render-to-html';

export default defineHandler(async event => {
  const slugParam = event.context.params?.slug ?? '';
  const slug = slugParam ? slugParam.split('/') : [];
  const page = await getPage(slug);

  if (!page) {
    throw new HTTPError({ status: 404, message: 'Page not found' });
  }

  const component = await loadPageComponent(page);
  const contentHtml = component
    ? await renderToHtml(React.createElement(component, { components: mdxComponents }))
    : '';

  return { frontmatter: page.frontmatter, contentHtml };
});
