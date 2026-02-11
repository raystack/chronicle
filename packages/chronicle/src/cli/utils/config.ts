import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'
import chalk from 'chalk'
import type { ChronicleConfig } from '../../types'

export interface CLIConfig {
  config: ChronicleConfig
  configPath: string
  contentDir: string
}

export function resolveContentDir(contentFlag?: string): string {
  if (contentFlag) return path.resolve(contentFlag)
  if (process.env.CHRONICLE_CONTENT_DIR) return path.resolve(process.env.CHRONICLE_CONTENT_DIR)
  return process.cwd()
}

export function loadCLIConfig(contentDir: string): CLIConfig {
  const configPath = path.join(contentDir, 'chronicle.yaml')

  if (!fs.existsSync(configPath)) {
    console.log(chalk.red('Error: chronicle.yaml not found in'), contentDir)
    console.log(chalk.gray(`Run 'chronicle init' to create one`))
    process.exit(1)
  }

  const config = parse(fs.readFileSync(configPath, 'utf-8')) as ChronicleConfig

  return {
    config,
    configPath,
    contentDir,
  }
}
