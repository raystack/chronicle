import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { defineHandler, HTTPError } from 'nitro';
import { loadConfig } from '@/lib/config';

function getContentDir(): string {
  return __CHRONICLE_CONTENT_DIR__ || path.join(process.cwd(), 'content');
}

async function scanPages(): Promise<{ title: string; url: string }[]> {
  const contentDir = getContentDir();
  const pages: { title: string; url: string }[] = [];

  async function scan(dir: string, prefix: string[] = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules')
          continue;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath, [...prefix, entry.name]);
          continue;
        }

        if (!entry.name.endsWith('.mdx') && !entry.name.endsWith('.md'))
          continue;

        const raw = await fs.readFile(fullPath, 'utf-8');
        const { data: fm } = matter(raw);
        const baseName = entry.name.replace(/\.(mdx|md)$/, '');
        const slugs = baseName === 'index' ? prefix : [...prefix, baseName];
        const url = slugs.length === 0 ? '/' : `/${slugs.join('/')}`;

        pages.push({ title: fm.title ?? baseName, url });
      }
    } catch {
      /* directory not readable */
    }
  }

  await scan(contentDir);
  return pages;
}

export default defineHandler(async event => {
  const config = loadConfig();

  if (!config.llms?.enabled) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const pages = await scanPages();
  const index = pages.map(p => `- [${p.title}](${p.url})`).join('\n');
  const body = `# ${config.title}\n\n${config.description ?? ''}\n\n${index}`;

  event.res.headers.set('Content-Type', 'text/plain');
  return body;
});
