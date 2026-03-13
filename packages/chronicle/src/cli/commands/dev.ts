import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import { attachLifecycleHandlers, resolveNextCli } from '@/cli/utils'

export const devCommand = new Command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .action((options) => {
    const scaffoldPath = path.join(process.cwd(), '.chronicle')
    if (!fs.existsSync(scaffoldPath)) {
      console.log(chalk.red('Error: .chronicle/ not found. Run'), chalk.cyan('chronicle init'), chalk.red('first.'))
      process.exit(1)
    }

    const nextCli = resolveNextCli()

    console.log(chalk.cyan('Starting dev server...'))

    const child = spawn(process.execPath, [nextCli, 'dev', '-p', options.port], {
      stdio: 'inherit',
      cwd: scaffoldPath,
      env: {
        ...process.env,
        CHRONICLE_PROJECT_ROOT: process.cwd(),
        CHRONICLE_CONTENT_DIR: './content',
      },
    })

    attachLifecycleHandlers(child)
  })
