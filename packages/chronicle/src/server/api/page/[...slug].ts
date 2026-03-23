import path from 'node:path';
import { defineHandler, HTTPError } from 'nitro';
import { getPage } from '@/lib/source';

export default defineHandler(async event => {
  const slugParam = event.context.params?.slug ?? '';
  const slug = slugParam ? slugParam.split('/') : [];
  const page = await getPage(slug);

  if (!page) {
    throw new HTTPError({ status: 404, message: 'Page not found' });
  }

  const contentDir = __CHRONICLE_CONTENT_DIR__;
  const relativePath = path.relative(contentDir, page.filePath);

  return { frontmatter: page.frontmatter, relativePath };
});
