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

export function loadCLIConfig(cwd: string = process.cwd()): CLIConfig {
  const configPath = path.join(cwd, 'chronicle.yaml')

  if (!fs.existsSync(configPath)) {
    console.log(chalk.red('Error: chronicle.yaml not found'))
    console.log(chalk.gray(`Run 'chronicle init' to create one`))
    process.exit(1)
  }

  const config = parse(fs.readFileSync(configPath, 'utf-8')) as ChronicleConfig
  const contentDir = path.resolve(cwd, config.contentDir || '.')

  return {
    config,
    configPath,
    contentDir,
  }
}
