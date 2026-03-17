import { Command } from 'commander'
import path from 'path'
import chalk from 'chalk'
import { resolveContentDir } from '@/cli/utils/config'
import { PACKAGE_ROOT } from '@/cli/utils/resolve'

export const serveCommand = new Command('serve')
  .description('Build and start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .option('-o, --outDir <path>', 'Output directory', 'dist')
  .action(async (options) => {
    const contentDir = resolveContentDir(options.content)
    const port = parseInt(options.port, 10)
    const outDir = path.resolve(options.outDir)

    process.env.CHRONICLE_PROJECT_ROOT = process.cwd()
    process.env.CHRONICLE_CONTENT_DIR = contentDir

    // Build
    console.log(chalk.cyan('Building for production...'))

    const { build } = await import('vite')
    const { createViteConfig } = await import('@/server/vite-config')

    const baseConfig = await createViteConfig({ root: PACKAGE_ROOT, contentDir })

    await build({
      ...baseConfig,
      build: {
        outDir: path.join(outDir, 'client'),
        ssrManifest: true,
        rolldownOptions: {
          input: path.resolve(PACKAGE_ROOT, 'src/server/index.html'),
        },
      },
    })

    await build({
      ...baseConfig,
      ssr: {
        noExternal: true,
      },
      build: {
        outDir: path.join(outDir, 'server'),
        ssr: path.resolve(PACKAGE_ROOT, 'src/server/entry-prod.ts'),
      },
    })

    // Start
    console.log(chalk.cyan('Starting production server...'))

    const { startProdServer } = await import('@/server/prod')
    await startProdServer({ port, root: PACKAGE_ROOT, distDir: outDir })
  })
