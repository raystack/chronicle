import { execSync } from 'child_process'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { PACKAGE_ROOT } from './resolve'

const COPY_FILES = ['src', 'source.config.ts', 'tsconfig.json']

function copyRecursive(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry))
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

function ensureRemoved(targetPath: string) {
  try {
    fs.lstatSync(targetPath)
    fs.rmSync(targetPath, { recursive: true, force: true })
  } catch {
    // nothing exists, proceed
  }
}

export function detectPackageManager(): string {
  if (process.env.npm_config_user_agent) {
    return process.env.npm_config_user_agent.split('/')[0]
  }
  const cwd = process.cwd()
  if (fs.existsSync(path.join(cwd, 'bun.lock')) || fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun'
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

function generateNextConfig(scaffoldPath: string) {
  const config = `import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default withMDX(nextConfig)
`
  fs.writeFileSync(path.join(scaffoldPath, 'next.config.mjs'), config)
}

function createPackageJson(): Record<string, unknown> {
  return {
    name: 'chronicle-docs',
    private: true,
    dependencies: {
      '@raystack/chronicle': `^${getChronicleVersion()}`,
    },
    devDependencies: {
      '@raystack/tools-config': '0.56.0',
      'openapi-types': '^12.1.3',
      typescript: '5.9.3',
      '@types/react': '^19.2.10',
      '@types/node': '^25.1.0',
    },
  }
}

function ensureDeps() {
  const cwd = process.cwd()
  const cwdPkgJson = path.join(cwd, 'package.json')
  const cwdNodeModules = path.join(cwd, 'node_modules')

  if (fs.existsSync(cwdPkgJson) && fs.existsSync(cwdNodeModules)) {
    // Case 1: existing project with deps installed
    return
  }

  // Case 2: no package.json — create in cwd and install
  if (!fs.existsSync(cwdPkgJson)) {
    fs.writeFileSync(cwdPkgJson, JSON.stringify(createPackageJson(), null, 2) + '\n')
  }

  if (!fs.existsSync(cwdNodeModules)) {
    const pm = detectPackageManager()
    console.log(chalk.cyan(`Installing dependencies with ${pm}...`))
    execSync(`${pm} install`, { cwd, stdio: 'inherit' })
  }
}

export function getChronicleVersion(): string {
  const pkgPath = path.join(PACKAGE_ROOT, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  return pkg.version
}

export function resolveNextCli(): string {
  const chronicleRequire = createRequire(path.join(PACKAGE_ROOT, 'package.json'))
  return chronicleRequire.resolve('next/dist/bin/next')
}

export function scaffoldDir(contentDir: string): string {
  const scaffoldPath = path.join(process.cwd(), '.chronicle')

  // Create .chronicle/ if not exists
  if (!fs.existsSync(scaffoldPath)) {
    fs.mkdirSync(scaffoldPath, { recursive: true })
  }

  // Copy package files
  for (const name of COPY_FILES) {
    const src = path.join(PACKAGE_ROOT, name)
    const dest = path.join(scaffoldPath, name)
    ensureRemoved(dest)
    copyRecursive(src, dest)
  }

  // Generate next.config.mjs
  generateNextConfig(scaffoldPath)

  // Symlink content dir
  const contentLink = path.join(scaffoldPath, 'content')
  ensureRemoved(contentLink)
  fs.symlinkSync(path.resolve(contentDir), contentLink)

  // Ensure dependencies are available
  ensureDeps()

  console.log(chalk.gray(`Scaffold: ${scaffoldPath}`))

  return scaffoldPath
}
