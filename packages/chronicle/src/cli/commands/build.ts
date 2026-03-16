import { Command } from 'commander'
import path from 'path'
import chalk from 'chalk'
import { resolveContentDir } from '@/cli/utils/config'
import { PACKAGE_ROOT } from '@/cli/utils/resolve'

export const buildCommand = new Command('build')
  .description('Build for production')
  .option('-c, --content <path>', 'Content directory')
  .option('-o, --outDir <path>', 'Output directory', 'dist')
  .action(async (options) => {
    const contentDir = resolveContentDir(options.content)
    const outDir = path.resolve(options.outDir)

    process.env.CHRONICLE_PROJECT_ROOT = process.cwd()
    process.env.CHRONICLE_CONTENT_DIR = contentDir

    console.log(chalk.cyan('Building for production...'))

    const { build } = await import('vite')
    const { createViteConfig } = await import('@/server/vite-config')

    const baseConfig = await createViteConfig({ root: PACKAGE_ROOT, contentDir })

    // Build client bundle
    console.log(chalk.gray('Building client...'))
    await build({
      ...baseConfig,
      build: {
        outDir: path.join(outDir, 'client'),
        ssrManifest: true,
        rollupOptions: {
          input: path.resolve(PACKAGE_ROOT, 'src/server/index.html'),
        },
      },
    })

    // Build server bundle
    console.log(chalk.gray('Building server...'))
    await build({
      ...baseConfig,
      build: {
        outDir: path.join(outDir, 'server'),
        ssr: path.resolve(PACKAGE_ROOT, 'src/server/entry-server.tsx'),
      },
    })

    console.log(chalk.green('Build complete →'), outDir)
  })
