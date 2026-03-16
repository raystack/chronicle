import { Command } from 'commander'
import path from 'path'
import chalk from 'chalk'
import { resolveContentDir } from '@/cli/utils/config'
import { PACKAGE_ROOT } from '@/cli/utils/resolve'

export const startCommand = new Command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .option('-d, --dist <path>', 'Dist directory', 'dist')
  .action(async (options) => {
    const contentDir = resolveContentDir(options.content)
    const port = parseInt(options.port, 10)
    const distDir = path.resolve(options.dist)

    process.env.CHRONICLE_PROJECT_ROOT = process.cwd()
    process.env.CHRONICLE_CONTENT_DIR = contentDir

    console.log(chalk.cyan('Starting production server...'))

    const { startProdServer } = await import('@/server/prod')
    await startProdServer({ port, root: PACKAGE_ROOT, distDir })
  })
