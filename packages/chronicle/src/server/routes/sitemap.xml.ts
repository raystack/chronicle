import { defineHandler } from 'nitro';
import { buildApiRoutes } from '@/lib/api-routes';
import { loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';
import { getPages } from '@/lib/source';

export default defineHandler(async event => {
  const config = loadConfig();

  if (!config.url) {
    event.res.headers.set('Content-Type', 'application/xml');
    return '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>';
  }

  const baseUrl = config.url.replace(/\/$/, '');

  const pages = await getPages();
  const docPages = pages.map(page => {
    const lastmod = page.frontmatter.lastModified
      ? `<lastmod>${new Date(page.frontmatter.lastModified).toISOString()}</lastmod>`
      : '';
    return `<url><loc>${baseUrl}/${page.slugs.join('/')}</loc>${lastmod}</url>`;
  });

  const apiPages = config.api?.length
    ? buildApiRoutes(await loadApiSpecs(config.api)).map(
        route => `<url><loc>${baseUrl}/apis/${route.slug.join('/')}</loc></url>`
      )
    : [];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${baseUrl}</loc></url>
${[...docPages, ...apiPages].join('\n')}
</urlset>`;

  event.res.headers.set('Content-Type', 'application/xml');
  return xml;
});
