import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import chalk from 'chalk'
import { resolveContentDir, loadCLIConfig } from '../utils'

declare const PACKAGE_ROOT: string

const nextBin = path.join(PACKAGE_ROOT, 'node_modules', '.bin', 'next')

export const startCommand = new Command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .action((options) => {
    const contentDir = resolveContentDir(options.content)
    const { config } = loadCLIConfig(contentDir)

    console.log(chalk.cyan('Starting production server...'))
    console.log(chalk.gray(`Content: ${contentDir}`))

    const child = spawn(nextBin, ['start', '-p', options.port], {
      stdio: 'inherit',
      cwd: PACKAGE_ROOT,
      env: {
        ...process.env,
        CHRONICLE_CONTENT_DIR: contentDir,
      },
    })

    child.on('close', (code) => process.exit(code ?? 0))
    process.on('SIGINT', () => child.kill('SIGINT'))
    process.on('SIGTERM', () => child.kill('SIGTERM'))
  })
