import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import chalk from 'chalk'
import { resolveContentDir, loadCLIConfig } from '../utils'

declare const PACKAGE_ROOT: string

const nextBin = path.join(PACKAGE_ROOT, 'node_modules', '.bin', 'next')

export const buildCommand = new Command('build')
  .description('Build for production')
  .option('-c, --content <path>', 'Content directory')
  .action((options) => {
    const contentDir = resolveContentDir(options.content)
    const { config } = loadCLIConfig(contentDir)

    console.log(chalk.cyan('Building for production...'))
    console.log(chalk.gray(`Content: ${contentDir}`))

    const child = spawn(nextBin, ['build'], {
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
