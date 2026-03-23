import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import type { ChronicleConfig } from '@/types';

const CONFIG_FILE = 'chronicle.yaml';

const defaultConfig: ChronicleConfig = {
  title: 'Documentation',
  theme: { name: 'default' },
  search: { enabled: true, placeholder: 'Search...' }
};

function resolveConfigPath(): string | null {
  const projectRoot =
    typeof __CHRONICLE_PROJECT_ROOT__ !== 'undefined'
      ? __CHRONICLE_PROJECT_ROOT__
      : process.cwd();

  const rootPath = path.join(projectRoot, CONFIG_FILE);
  if (fs.existsSync(rootPath)) return rootPath;

  const contentDir =
    typeof __CHRONICLE_CONTENT_DIR__ !== 'undefined'
      ? __CHRONICLE_CONTENT_DIR__
      : undefined;
  if (contentDir) {
    const contentPath = path.join(contentDir, CONFIG_FILE);
    if (fs.existsSync(contentPath)) return contentPath;
  }

  return null;
}

export function loadConfig(): ChronicleConfig {
  const configPath = resolveConfigPath();

  if (!configPath) {
    return defaultConfig;
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
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
