import { defineHandler } from 'nitro';
import { buildAuthorIndex } from '@/lib/author-index';
import { loadConfig } from '@/lib/config';
import { extractFrontmatter, getPages } from '@/lib/source';

export default defineHandler(async () => {
  const config = loadConfig();
  const pages = await getPages();

  return Response.json(
    buildAuthorIndex(
      pages.map(page => ({ url: page.url, frontmatter: extractFrontmatter(page) })),
      config,
    ),
  );
});
