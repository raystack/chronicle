import { Command } from 'commander'
import { spawn } from 'child_process'
import { createRequire } from 'module'
import chalk from 'chalk'
import { resolveContentDir, loadCLIConfig, attachLifecycleHandlers, scaffoldDir } from '@/cli/utils'

const require = createRequire(import.meta.url)
const nextCli = require.resolve('next/dist/bin/next')

export const buildCommand = new Command('build')
  .description('Build for production')
  .option('-c, --content <path>', 'Content directory')
  .action((options) => {
    const contentDir = resolveContentDir(options.content)
    loadCLIConfig(contentDir)
    const scaffoldPath = scaffoldDir(contentDir)

    console.log(chalk.cyan('Building for production...'))
    console.log(chalk.gray(`Content: ${contentDir}`))

    const child = spawn(process.execPath, [nextCli, 'build'], {
      stdio: 'inherit',
      cwd: scaffoldPath,
      env: {
        ...process.env,
        CHRONICLE_CONTENT_DIR: './content',
      },
    })

    attachLifecycleHandlers(child)
  })
