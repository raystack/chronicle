import { defineHandler } from 'nitro';
import { buildApiRoutes } from '@/lib/api-routes';
import { getAllVersions, getApiConfigsForVersion, loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';
import { getPages } from '@/lib/source';

export default defineHandler(async () => {
  const config = loadConfig();

  if (!config.url) {
    return new Response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', { headers: { 'Content-Type': 'application/xml' } });
  }

  const baseUrl = config.url.replace(/\/$/, '');

  const pages = await getPages();
  const docPages = pages.map(page => {
    const data = page.data as Record<string, unknown>;
    const lastmod = data.lastModified
      ? `<lastmod>${new Date(data.lastModified as string).toISOString()}</lastmod>`
      : '';
    return `<url><loc>${baseUrl}/${page.slugs.join('/')}</loc>${lastmod}</url>`;
  });

  const apiPages: string[] = [];
  for (const v of getAllVersions(config)) {
    const versionDir = v.isLatest ? null : v.dir;
    const apiConfigs = getApiConfigsForVersion(config, versionDir);
    if (!apiConfigs.length) continue;
    const prefix = versionDir ? `/${versionDir}` : '';
    const routes = buildApiRoutes(await loadApiSpecs(apiConfigs));
    for (const route of routes) {
      apiPages.push(
        `<url><loc>${baseUrl}${prefix}/apis/${route.slug.join('/')}</loc></url>`,
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${baseUrl}</loc></url>
${[...docPages, ...apiPages].join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
});
