import { defineHandler, HTTPError } from 'nitro';
import { getPage, extractFrontmatter, getRelativePath, getOriginalPath } from '@/lib/source';

export default defineHandler(async event => {
  const slugParam = event.context.params?.slug ?? '';
  const slug = slugParam ? slugParam.split('/') : [];
  const page = await getPage(slug);

  if (!page) {
    throw new HTTPError({ status: 404, message: 'Page not found' });
  }

  return {
    frontmatter: extractFrontmatter(page, slug[slug.length - 1]),
    relativePath: getRelativePath(page),
    originalPath: getOriginalPath(page),
  };
});
