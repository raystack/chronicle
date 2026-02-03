import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { stringify } from 'yaml'
import type { ChronicleConfig } from '../../types'

function createConfig(contentDir: string): ChronicleConfig {
  return {
    title: 'My Documentation',
    description: 'Documentation powered by Chronicle',
    contentDir,
    theme: { name: 'default' },
    search: { enabled: true, placeholder: 'Search documentation...' },
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
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-c, --content-dir <path>', 'Content directory', './content')
  .action((options) => {
    const projectDir = options.dir
    const contentDir = options.contentDir

    // Create project directory
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
      console.log(chalk.green('✓'), 'Created', projectDir)
    }

    // Create chronicle.yaml
    const configPath = path.join(projectDir, 'chronicle.yaml')
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, stringify(createConfig(contentDir)))
      console.log(chalk.green('✓'), 'Created', configPath)
    } else {
      console.log(chalk.yellow('⚠'), configPath, 'already exists')
    }

    // Create content directory
    const contentPath = path.join(projectDir, contentDir)
    if (!fs.existsSync(contentPath)) {
      fs.mkdirSync(contentPath, { recursive: true })
      console.log(chalk.green('✓'), 'Created', contentPath)
    }

    // Create sample index.mdx
    const indexPath = path.join(contentPath, 'index.mdx')
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, sampleMdx)
      console.log(chalk.green('✓'), 'Created', indexPath)
    }

    console.log(chalk.green('\n✓ Chronicle initialized!'))
    console.log('\nRun', chalk.cyan('chronicle dev'), 'to start development server')
  })
