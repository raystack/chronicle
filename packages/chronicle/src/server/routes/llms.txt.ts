import { defineHandler, HTTPError } from 'nitro';
import { loadConfig } from '@/lib/config';
import { getPages, extractFrontmatter } from '@/lib/source';

export default defineHandler(async event => {
  const config = loadConfig();

  if (!config.llms?.enabled) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const pages = await getPages();
  const index = pages.map(p => {
    const fm = extractFrontmatter(p);
    return `- [${fm.title}](${p.url})`;
  }).join('\n');
  const body = `# ${config.title}\n\n${config.description ?? ''}\n\n${index}`;

  event.res.headers.set('Content-Type', 'text/plain');
  return body;
});
