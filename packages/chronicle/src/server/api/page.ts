import { defineHandler, HTTPError } from 'nitro';
import { loadConfig } from '@/lib/config';
import { getPage, getPageTree, isDraft, getPageNav, extractFrontmatter, getRelativePath, getOriginalPath, getPageImages } from '@/lib/source';
import { resolvePageAndSlug } from '@/lib/tree-utils';
import { resolveVersionFromUrl } from '@/lib/version-source';

export default defineHandler(async event => {
  const slugParam = event.url.searchParams.get('slug') ?? '';
  const slug = slugParam ? slugParam.split(',').filter(Boolean) : [];
  const config = loadConfig();
  const version = resolveVersionFromUrl(`/${slug.join('/')}`, config);
  const resolved = await resolvePageAndSlug(slug, { getPage, getPageTree, isDraft, config, version });

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
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
  });
});
