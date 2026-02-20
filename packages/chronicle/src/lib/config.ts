import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'
import type { ChronicleConfig } from '@/types'

const CONFIG_FILE = 'chronicle.yaml'

const defaultConfig: ChronicleConfig = {
  title: 'Documentation',
  theme: { name: 'default' },
  search: { enabled: true, placeholder: 'Search...' },
}

export function loadConfig(): ChronicleConfig {
  const dir = process.env.CHRONICLE_CONTENT_DIR ?? process.cwd()
  const configPath = path.join(dir, CONFIG_FILE)

  if (!fs.existsSync(configPath)) {
    return defaultConfig
  }

  const raw = fs.readFileSync(configPath, 'utf-8')
  const userConfig = parse(raw) as Partial<ChronicleConfig>

  return {
    ...defaultConfig,
    ...userConfig,
    theme: {
      name: userConfig.theme?.name ?? defaultConfig.theme!.name,
      colors: { ...defaultConfig.theme?.colors, ...userConfig.theme?.colors },
    },
    search: { ...defaultConfig.search, ...userConfig.search },
    footer: userConfig.footer,
    api: userConfig.api,
  }
}