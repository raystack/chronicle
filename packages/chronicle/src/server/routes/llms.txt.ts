import { defineHandler, HTTPError } from 'nitro';
import { loadConfig } from '@/lib/config';
import { buildLlmsTxt } from '@/lib/llms';
import { extractFrontmatter, getPagesForVersion } from '@/lib/source';
import { LATEST_CONTEXT } from '@/lib/version-source';

export default defineHandler(async event => {
  const config = loadConfig();

  if (!config.llms?.enabled) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const pages = await getPagesForVersion(LATEST_CONTEXT);
  const body = buildLlmsTxt(
    config,
    pages.map(p => ({ url: p.url, title: extractFrontmatter(p).title })),
    LATEST_CONTEXT,
  );

  event.res.headers.set('Content-Type', 'text/plain');
  return body;
});
