import { Command } from 'commander'
import path from 'path'
import chalk from 'chalk'
import { resolveContentDir } from '@/cli/utils/config'
import { PACKAGE_ROOT } from '@/cli/utils/resolve'

export const buildCommand = new Command('build')
  .description('Build for production')
  .option('-c, --content <path>', 'Content directory')
  .option('-o, --outDir <path>', 'Output directory', 'dist')
  .option('--adapter <adapter>', 'Deploy adapter (vercel)')
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
        rolldownOptions: {
          input: path.resolve(PACKAGE_ROOT, 'src/server/index.html'),
        },
      },
    })

    // Build server bundle
    const serverEntry = options.adapter === 'vercel'
      ? path.resolve(PACKAGE_ROOT, 'src/server/entry-vercel.ts')
      : path.resolve(PACKAGE_ROOT, 'src/server/entry-prod.ts')

    console.log(chalk.gray('Building server...'))
    await build({
      ...baseConfig,
      ssr: {
        noExternal: true,
      },
      build: {
        outDir: path.join(outDir, 'server'),
        ssr: serverEntry,
      },
    })

    console.log(chalk.green('Build complete →'), outDir)

    // Run Vercel adapter post-build
    if (options.adapter === 'vercel') {
      const { buildVercelOutput } = await import('@/server/adapters/vercel')
      await buildVercelOutput({
        distDir: outDir,
        contentDir,
        projectRoot: process.cwd(),
      })
    }
  })
