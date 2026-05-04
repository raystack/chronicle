import { defineHandler } from 'nitro';
import { loadConfig } from '@/lib/config';

export default defineHandler(() => {
  const config = loadConfig();
  const sitemap = config.url ? `\nSitemap: ${config.url}/sitemap.xml` : '';
  const body = `User-agent: *\nAllow: /${sitemap}`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
});
