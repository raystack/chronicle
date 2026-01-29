import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'
import type { ChronicleConfig } from '../types'

const CONFIG_FILE = 'chronicle.yaml'

const defaultConfig: ChronicleConfig = {
  title: 'Documentation',
  theme: { name: 'default' },
  search: { enabled: true, placeholder: 'Search...' },
}

export function loadConfig(contentDir: string = './content'): ChronicleConfig {
  const configPath = path.join(contentDir, CONFIG_FILE)

  if (!fs.existsSync(configPath)) {
    return defaultConfig
  }

  const raw = fs.readFileSync(configPath, 'utf-8')
  const userConfig = parse(raw) as Partial<ChronicleConfig>

  return {
    ...defaultConfig,
    ...userConfig,
    theme: { ...defaultConfig.theme, ...userConfig.theme },
    search: { ...defaultConfig.search, ...userConfig.search },
  }
}

export function getConfigPath(contentDir: string = './content'): string {
  return path.join(contentDir, CONFIG_FILE)
}
