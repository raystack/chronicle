import { defineHandler, HTTPError } from 'nitro';
import { getPageNav, extractFrontmatter, getRelativePath, getOriginalPath, getPageImages } from '@/lib/source';
import { resolvePageAndSlug } from '@/lib/tree-utils';

export default defineHandler(async event => {
  const slugParam = event.url.searchParams.get('slug') ?? '';
  const slug = slugParam ? slugParam.split(',').filter(Boolean) : [];
  const result = await resolvePageAndSlug(slug);

  if (!result) {
    throw new HTTPError({ status: 404, message: 'Page not found' });
  }

  const nav = await getPageNav(result.slug);

  return Response.json({
    frontmatter: extractFrontmatter(result.page, result.slug[result.slug.length - 1]),
    relativePath: getRelativePath(result.page),
    originalPath: getOriginalPath(result.page),
    images: getPageImages(result.page),
    prev: nav.prev,
    next: nav.next,
  });
});
