import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import chalk from 'chalk'
import { resolveContentDir, loadCLIConfig, attachLifecycleHandlers } from '@/cli/utils'

declare const PACKAGE_ROOT: string

const nextBin = path.join(PACKAGE_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next')

export const serveCommand = new Command('serve')
  .description('Build and start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .action((options) => {
    const contentDir = resolveContentDir(options.content)
    loadCLIConfig(contentDir)

    const env = {
      ...process.env,
      CHRONICLE_CONTENT_DIR: contentDir,
    }

    console.log(chalk.cyan('Building for production...'))
    console.log(chalk.gray(`Content: ${contentDir}`))

    const buildChild = spawn(nextBin, ['build'], {
      stdio: 'inherit',
      cwd: PACKAGE_ROOT,
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

      const startChild = spawn(nextBin, ['start', '-p', options.port], {
        stdio: 'inherit',
        cwd: PACKAGE_ROOT,
        env,
      })

      attachLifecycleHandlers(startChild)
    })
  })
