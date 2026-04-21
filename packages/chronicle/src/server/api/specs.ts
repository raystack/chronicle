import { defineHandler } from 'nitro';
import { getApiConfigsForVersion, loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';

export default defineHandler(async event => {
  const versionParam = event.url.searchParams.get('version');
  const versionDir = versionParam === null || versionParam === '' ? null : versionParam;

  const config = loadConfig();
  const apiConfigs = getApiConfigsForVersion(config, versionDir);
  if (!apiConfigs.length) return [];

  return loadApiSpecs(apiConfigs);
});
