import { Command } from 'commander'
import chalk from 'chalk'
import { resolveContentDir } from '@/cli/utils/config'
import { PACKAGE_ROOT } from '@/cli/utils/resolve'

export const devCommand = new Command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .action(async (options) => {
    const contentDir = resolveContentDir(options.content)
    const port = parseInt(options.port, 10)

    process.env.CHRONICLE_PROJECT_ROOT = process.cwd()
    process.env.CHRONICLE_CONTENT_DIR = contentDir

    console.log(chalk.cyan('Starting dev server...'))

    const { startDevServer } = await import('@/server/dev')
    await startDevServer({ port, root: PACKAGE_ROOT, contentDir })
  })
