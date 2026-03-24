import { parse } from 'yaml';
import type { ChronicleConfig } from '@/types';

const defaultConfig: ChronicleConfig = {
  title: 'Documentation',
  theme: { name: 'default' },
  search: { enabled: true, placeholder: 'Search...' }
};

export function loadConfig(): ChronicleConfig {
  const raw = typeof __CHRONICLE_CONFIG_RAW__ !== 'undefined' ? __CHRONICLE_CONFIG_RAW__ : null;

  if (!raw) {
    return defaultConfig;
  }

  const userConfig = parse(raw) as Partial<ChronicleConfig>;

  return {
    ...defaultConfig,
    ...userConfig,
    theme: {
      name: userConfig.theme?.name ?? defaultConfig.theme!.name,
      colors: { ...defaultConfig.theme?.colors, ...userConfig.theme?.colors }
    },
    search: { ...defaultConfig.search, ...userConfig.search },
    footer: userConfig.footer,
    api: userConfig.api,
    llms: { enabled: false, ...userConfig.llms },
    analytics: { enabled: false, ...userConfig.analytics }
  };
}
