import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import chalk from 'chalk'
import { resolveContentDir, loadCLIConfig, attachLifecycleHandlers } from '@/cli/utils'

declare const PACKAGE_ROOT: string

const nextBin = path.join(PACKAGE_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next')

export const devCommand = new Command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .action((options) => {
    const contentDir = resolveContentDir(options.content)
    loadCLIConfig(contentDir)

    console.log(chalk.cyan('Starting dev server...'))
    console.log(chalk.gray(`Content: ${contentDir}`))

    const child = spawn(nextBin, ['dev', '-p', options.port], {
      stdio: 'inherit',
      cwd: PACKAGE_ROOT,
      env: {
        ...process.env,
        CHRONICLE_CONTENT_DIR: contentDir,
      },
    })

    attachLifecycleHandlers(child)
  })
