import { defineHandler, HTTPError } from 'nitro';
import { getPage, getPageNav, extractFrontmatter, getRelativePath, getOriginalPath, isDraft } from '@/lib/source';

export default defineHandler(async event => {
  const slugParam = event.url.searchParams.get('slug') ?? '';
  const slug = slugParam ? slugParam.split(',').filter(Boolean) : [];
  const page = await getPage(slug);

  if (!page || isDraft(page)) {
    throw new HTTPError({ status: 404, message: 'Page not found' });
  }

  const nav = await getPageNav(slug);

  return Response.json({
    frontmatter: extractFrontmatter(page, slug[slug.length - 1]),
    relativePath: getRelativePath(page),
    originalPath: getOriginalPath(page),
    prev: nav.prev,
    next: nav.next,
  });
});
