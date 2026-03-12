import { Command } from 'commander'
import { spawn } from 'child_process'
import { createRequire } from 'module'
import chalk from 'chalk'
import { resolveContentDir, loadCLIConfig, attachLifecycleHandlers, scaffoldDir } from '@/cli/utils'

const require = createRequire(import.meta.url)
const nextCli = require.resolve('next/dist/bin/next')

export const serveCommand = new Command('serve')
  .description('Build and start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .action((options) => {
    const contentDir = resolveContentDir(options.content)
    loadCLIConfig(contentDir)
    const scaffoldPath = scaffoldDir(contentDir)

    const env = {
      ...process.env,
      CHRONICLE_CONTENT_DIR: './content',
    }

    console.log(chalk.cyan('Building for production...'))
    console.log(chalk.gray(`Content: ${contentDir}`))

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
