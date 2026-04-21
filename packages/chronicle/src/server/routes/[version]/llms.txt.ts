import { defineHandler, HTTPError } from 'nitro';
import { loadConfig } from '@/lib/config';
import { buildLlmsTxt } from '@/lib/llms';
import { extractFrontmatter, getPagesForVersion } from '@/lib/source';

export default defineHandler(async event => {
  const config = loadConfig();

  if (!config.llms?.enabled) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const versionDir = event.params?.version;
  const version = config.versions?.find(v => v.dir === versionDir);
  if (!version) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const ctx = { dir: version.dir, urlPrefix: `/${version.dir}` };
  const pages = await getPagesForVersion(ctx);
  const body = buildLlmsTxt(
    config,
    pages.map(p => ({ url: p.url, title: extractFrontmatter(p).title })),
    ctx,
  );

  event.res.headers.set('Content-Type', 'text/plain');
  return body;
});
