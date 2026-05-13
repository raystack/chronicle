import fs from 'node:fs/promises';
import matter from 'gray-matter';
import { defineHandler, HTTPError } from 'nitro';
import { getPage, getOriginalPath } from '@/lib/source';
import { safePath } from '@/server/utils/safe-path';

export default defineHandler(async event => {
  const pathname = event.path || event.req.url?.split('?')[0] || '';
  if (!pathname.endsWith('.md')) return;
  if (pathname.startsWith('/apis/')) return;

  const stripped = pathname.replace(/\.md$/, '');
  const parts = stripped === '/index' || stripped === '/'
    ? []
    : stripped.slice(1).split('/').filter(Boolean);
  const page = await getPage(parts);

  if (!page) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const originalPath = getOriginalPath(page);
  if (!originalPath) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const contentDir = __CHRONICLE_CONTENT_DIR__;
  const filePath = safePath(contentDir, '/' + originalPath);
  if (!filePath) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const raw = await fs.readFile(filePath, 'utf-8').catch(() => null);
  if (!raw) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  return new Response(matter(raw).content, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
});
