import { defineHandler, HTTPError } from 'nitro';
import { getPage, getPageNav, extractFrontmatter, getRelativePath, getOriginalPath, loadPageModule } from '@/lib/source';

export default defineHandler(async event => {
  const slugParam = event.url.searchParams.get('slug') ?? '';
  const slug = slugParam ? slugParam.split(',').filter(Boolean) : [];
  const page = await getPage(slug);

  if (!page) {
    throw new HTTPError({ status: 404, message: 'Page not found' });
  }

  const nav = await getPageNav(slug);
  const originalPath = getOriginalPath(page);
  const relativePath = getRelativePath(page);
  const mdxModule = (originalPath || relativePath) ? await loadPageModule(originalPath || relativePath) : null;

  return {
    frontmatter: {
      ...extractFrontmatter(page, slug[slug.length - 1]),
      _readingTime: mdxModule?._readingTime,
    },
    relativePath,
    originalPath,
    prev: nav.prev,
    next: nav.next,
  };
});
