import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { stringify } from 'yaml'
import type { ChronicleConfig } from '../../types'

function createConfig(): ChronicleConfig {
  return {
    title: 'My Documentation',
    description: 'Documentation powered by Chronicle',
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
  .option('-d, --dir <path>', 'Content directory', '.')
  .action((options) => {
    const contentDir = path.resolve(options.dir)

    // Create content directory
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true })
      console.log(chalk.green('✓'), 'Created', contentDir)
    }

    // Create chronicle.yaml
    const configPath = path.join(contentDir, 'chronicle.yaml')
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, stringify(createConfig()))
      console.log(chalk.green('✓'), 'Created', configPath)
    } else {
      console.log(chalk.yellow('⚠'), configPath, 'already exists')
    }

    // Create sample index.mdx
    const indexPath = path.join(contentDir, 'index.mdx')
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, sampleMdx)
      console.log(chalk.green('✓'), 'Created', indexPath)
    }

    console.log(chalk.green('\n✓ Chronicle initialized!'))
    console.log('\nRun', chalk.cyan('chronicle dev'), 'to start development server')
  })
