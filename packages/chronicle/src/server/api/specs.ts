import { defineHandler, HTTPError } from 'nitro';
import { getApiConfigsForVersion, loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';

export default defineHandler(async event => {
  const versionParam = event.url.searchParams.get('version');
  const versionDir = versionParam === null || versionParam === '' ? null : versionParam;

  const config = loadConfig();
  if (versionDir && !config.versions?.some(v => v.dir === versionDir)) {
    throw new HTTPError({
      status: 400,
      message: `Unknown version: ${versionDir}`,
    });
  }

  const apiConfigs = getApiConfigsForVersion(config, versionDir);
  if (!apiConfigs.length) return Response.json([]);

  return Response.json(await loadApiSpecs(apiConfigs));
});
