import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import chalk from 'chalk'
import { resolveContentDir, loadCLIConfig, attachLifecycleHandlers } from '@/cli/utils'

const require = createRequire(import.meta.url)
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const nextCli = require.resolve('next/dist/bin/next')

export const startCommand = new Command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .action((options) => {
    const contentDir = resolveContentDir(options.content)
    loadCLIConfig(contentDir)

    console.log(chalk.cyan('Starting production server...'))
    console.log(chalk.gray(`Content: ${contentDir}`))

    const child = spawn(process.execPath, [nextCli, 'start', '-p', options.port], {
      stdio: 'inherit',
      cwd: PACKAGE_ROOT,
      env: {
        ...process.env,
        CHRONICLE_CONTENT_DIR: contentDir,
      },
    })

    attachLifecycleHandlers(child)
  })
