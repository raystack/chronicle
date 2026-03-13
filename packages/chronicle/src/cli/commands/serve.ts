import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import { attachLifecycleHandlers, resolveNextCli } from '@/cli/utils'

export const serveCommand = new Command('serve')
  .description('Build and start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .action((options) => {
    const scaffoldPath = path.join(process.cwd(), '.chronicle')
    if (!fs.existsSync(scaffoldPath)) {
      console.log(chalk.red('Error: .chronicle/ not found. Run'), chalk.cyan('chronicle init'), chalk.red('first.'))
      process.exit(1)
    }

    const nextCli = resolveNextCli()

    const env = {
      ...process.env,
      CHRONICLE_PROJECT_ROOT: process.cwd(),
      CHRONICLE_CONTENT_DIR: './content',
    }

    console.log(chalk.cyan('Building for production...'))

    const buildChild = spawn(process.execPath, [nextCli, 'build'], {
      stdio: 'inherit',
      cwd: scaffoldPath,
      env,
    })

    process.once('SIGINT', () => buildChild.kill('SIGINT'))
    process.once('SIGTERM', () => buildChild.kill('SIGTERM'))

    buildChild.on('close', (code) => {
      if (code !== 0) {
        console.log(chalk.red('Build failed'))
        process.exit(code ?? 1)
      }

      console.log(chalk.cyan('Starting production server...'))

      const startChild = spawn(process.execPath, [nextCli, 'start', '-p', options.port], {
        stdio: 'inherit',
        cwd: scaffoldPath,
        env,
      })

      attachLifecycleHandlers(startChild)
    })
  })
