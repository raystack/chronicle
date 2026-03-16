import { Command } from 'commander'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { stringify } from 'yaml'
import type { ChronicleConfig } from '@/types'
import { loadCLIConfig, scaffoldDir, detectPackageManager, getChronicleVersion } from '@/cli/utils'


function createConfig(): ChronicleConfig {
  return {
    title: 'My Documentation',
    description: 'Documentation powered by Chronicle',
    theme: { name: 'default' },
    search: { enabled: true, placeholder: 'Search documentation...' },
  }
}

function createPackageJson(name: string): Record<string, unknown> {
  return {
    name,
    private: true,
    type: 'module',
    scripts: {
      dev: 'chronicle dev',
      build: 'chronicle build',
      start: 'chronicle start',
    },
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

const sampleMdx = `---
title: Welcome
description: Getting started with your documentation
order: 1
---

# Welcome

This is your documentation home page.
`

export const initCommand = new Command('init')
  .description('Initialize a new Chronicle project')
  .option('-c, --content <path>', 'Content directory name', 'content')
  .action((options) => {
    const projectDir = process.cwd()
    const dirName = path.basename(projectDir) || 'docs'
    const contentDir = path.join(projectDir, options.content)

    // Create content directory if it doesn't exist
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true })
      console.log(chalk.green('✓'), 'Created', contentDir)
    }

    // Create or update package.json in project root
    const packageJsonPath = path.join(projectDir, 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(createPackageJson(dirName), null, 2) + '\n')
      console.log(chalk.green('✓'), 'Created', packageJsonPath)
    } else {
      const existing = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const template = createPackageJson(dirName)
      let updated = false

      // Set type to module
      if (existing.type !== 'module') {
        existing.type = 'module'
        updated = true
      }

      // Merge missing scripts
      if (!existing.scripts) existing.scripts = {}
      for (const [key, value] of Object.entries(template.scripts as Record<string, string>)) {
        if (!existing.scripts[key]) {
          existing.scripts[key] = value
          updated = true
        }
      }

      // Merge missing dependencies
      if (!existing.dependencies) existing.dependencies = {}
      for (const [key, value] of Object.entries(template.dependencies as Record<string, string>)) {
        if (!existing.dependencies[key]) {
          existing.dependencies[key] = value
          updated = true
        }
      }

      // Merge missing devDependencies
      if (!existing.devDependencies) existing.devDependencies = {}
      for (const [key, value] of Object.entries(template.devDependencies as Record<string, string>)) {
        if (!existing.devDependencies[key]) {
          existing.devDependencies[key] = value
          updated = true
        }
      }

      if (updated) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(existing, null, 2) + '\n')
        console.log(chalk.green('✓'), 'Updated', packageJsonPath, 'with missing scripts/deps')
      } else {
        console.log(chalk.yellow('⚠'), packageJsonPath, 'already has all required entries')
      }
    }

    // Create chronicle.yaml in project root
    const configPath = path.join(projectDir, 'chronicle.yaml')
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, stringify(createConfig()))
      console.log(chalk.green('✓'), 'Created', configPath)
    } else {
      console.log(chalk.yellow('⚠'), configPath, 'already exists')
    }

    // Create sample index.mdx only if content dir is empty
    const contentFiles = fs.readdirSync(contentDir)
    if (contentFiles.length === 0) {
      const indexPath = path.join(contentDir, 'index.mdx')
      fs.writeFileSync(indexPath, sampleMdx)
      console.log(chalk.green('✓'), 'Created', indexPath)
    }

    // Add entries to .gitignore
    const gitignorePath = path.join(projectDir, '.gitignore')
    const gitignoreEntries = ['.chronicle', 'node_modules', '.next']
    if (fs.existsSync(gitignorePath)) {
      const existing = fs.readFileSync(gitignorePath, 'utf-8')
      const missing = gitignoreEntries.filter(e => !existing.includes(e))
      if (missing.length > 0) {
        fs.appendFileSync(gitignorePath, `\n${missing.join('\n')}\n`)
        console.log(chalk.green('✓'), 'Added', missing.join(', '), 'to .gitignore')
      }
    } else {
      fs.writeFileSync(gitignorePath, `${gitignoreEntries.join('\n')}\n`)
      console.log(chalk.green('✓'), 'Created .gitignore')
    }

    // Install dependencies
    const pm = detectPackageManager()
    console.log(chalk.cyan(`\nInstalling dependencies with ${pm}...`))
    execSync(`${pm} install`, { cwd: projectDir, stdio: 'inherit' })

    // Scaffold .chronicle/ directory
    loadCLIConfig(contentDir)
    scaffoldDir(contentDir)

    const runCmd = pm === 'npm' ? 'npx' : pm === 'bun' ? 'bunx' : `${pm} dlx`
    console.log(chalk.green('\n✓ Chronicle initialized!'))
    console.log('\nRun', chalk.cyan(`${runCmd} chronicle dev`), 'to start development server')
  })
