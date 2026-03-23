import { defineHandler } from 'nitro';
import { loadConfig } from '@/lib/config';

export default defineHandler(event => {
  const config = loadConfig();
  const sitemap = config.url ? `\nSitemap: ${config.url}/sitemap.xml` : '';
  const body = `User-agent: *\nAllow: /${sitemap}`;

  event.res.headers.set('Content-Type', 'text/plain');
  return body;
});
