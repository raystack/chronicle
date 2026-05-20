import { defineHandler, HTTPError } from 'nitro';
import { getPageNav, extractFrontmatter, getRelativePath, getOriginalPath, getPageImages } from '@/lib/source';
import { resolvePageAndSlug } from '@/lib/tree-utils';

export default defineHandler(async event => {
  const slugParam = event.url.searchParams.get('slug') ?? '';
  const slug = slugParam ? slugParam.split(',').filter(Boolean) : [];
  const resolved = await resolvePageAndSlug(slug);

  if (!resolved) {
    throw new HTTPError({ status: 404, message: 'Page not found' });
  }

  const { page, slug: resolvedSlug } = resolved;
  const nav = await getPageNav(resolvedSlug);

  return Response.json({
    frontmatter: extractFrontmatter(page, resolvedSlug[resolvedSlug.length - 1]),
    relativePath: getRelativePath(page),
    originalPath: getOriginalPath(page),
    images: getPageImages(page),
    prev: nav.prev,
    next: nav.next,
  });
});
