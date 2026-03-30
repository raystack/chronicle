import { defineHandler } from 'nitro';
import { loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';

export default defineHandler(async () => {
  const config = loadConfig();
  const specs = config.api?.length ? await loadApiSpecs(config.api) : [];
  return specs;
});
