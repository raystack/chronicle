import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import chalk from 'chalk'

interface VercelAdapterOptions {
  distDir: string
  contentDir: string
  projectRoot: string
}

const CONTENT_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.pdf', '.json', '.yaml', '.yml', '.txt',
])

export async function buildVercelOutput(options: VercelAdapterOptions) {
  const { distDir, contentDir, projectRoot } = options
  const outputDir = path.resolve(projectRoot, '.vercel/output')

  console.log(chalk.gray('Generating Vercel output...'))

  // Clean previous output
  await fs.rm(outputDir, { recursive: true, force: true })

  // Create output directories
  const staticDir = path.resolve(outputDir, 'static')
  const funcDir = path.resolve(outputDir, 'functions/index.func')
  await fs.mkdir(staticDir, { recursive: true })
  await fs.mkdir(funcDir, { recursive: true })

  // 1. Copy client assets → .vercel/output/static/
  const clientDir = path.resolve(distDir, 'client')
  await copyDir(clientDir, staticDir)
  console.log(chalk.gray('  Copied client assets to static/'))

  // 2. Copy content dir assets (images, etc.) → .vercel/output/static/
  if (existsSync(contentDir)) {
    await copyContentAssets(contentDir, staticDir)
    console.log(chalk.gray('  Copied content assets to static/'))
  }

  // 3. Copy server bundle → .vercel/output/functions/index.func/
  const serverDir = path.resolve(distDir, 'server')
  await copyDir(serverDir, funcDir)
  console.log(chalk.gray('  Copied server bundle to functions/'))

  // 4. Copy HTML template into function dir (not accessible from static/ at runtime)
  const templateSrc = path.resolve(clientDir, 'src/server/index.html')
  await fs.copyFile(templateSrc, path.resolve(funcDir, 'index.html'))

  // 5. Write package.json for ESM support
  await fs.writeFile(
    path.resolve(funcDir, 'package.json'),
    JSON.stringify({ type: 'module' }, null, 2),
  )

  // 6. Write .vc-config.json
  await fs.writeFile(
    path.resolve(funcDir, '.vc-config.json'),
    JSON.stringify({
      runtime: 'nodejs24.x',
      handler: 'entry-vercel.js',
      launcherType: 'Nodejs',
    }, null, 2),
  )

  // 7. Write config.json
  await fs.writeFile(
    path.resolve(outputDir, 'config.json'),
    JSON.stringify({
      version: 3,
      routes: [
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index' },
      ],
    }, null, 2),
  )

  console.log(chalk.green('Vercel output generated →'), outputDir)
}

async function copyDir(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

async function copyContentAssets(contentDir: string, staticDir: string) {
  const entries = await fs.readdir(contentDir, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(contentDir, entry.name)

    if (entry.isDirectory()) {
      const destSubDir = path.join(staticDir, entry.name)
      await copyContentAssetsRecursive(srcPath, destSubDir)
    } else {
      const ext = path.extname(entry.name).toLowerCase()
      if (CONTENT_EXTENSIONS.has(ext)) {
        await fs.copyFile(srcPath, path.join(staticDir, entry.name))
      }
    }
  }
}

async function copyContentAssetsRecursive(srcDir: string, destDir: string) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name)

    if (entry.isDirectory()) {
      await copyContentAssetsRecursive(srcPath, path.join(destDir, entry.name))
    } else {
      const ext = path.extname(entry.name).toLowerCase()
      if (CONTENT_EXTENSIONS.has(ext)) {
        await fs.mkdir(destDir, { recursive: true })
        await fs.copyFile(srcPath, path.join(destDir, entry.name))
      }
    }
  }
}
