import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { stringify } from 'yaml';
import type { ChronicleConfig } from '@/types';

const defaultConfig: ChronicleConfig = {
  site: {
    title: 'My Documentation',
    description: 'Documentation powered by Chronicle',
  },
  content: [{ dir: 'docs', label: 'Docs' }],
  theme: { name: 'default' },
  search: { enabled: true, placeholder: 'Search documentation...' }
};

const sampleMdx = `---
title: Welcome
description: Getting started with your documentation
order: 1
---

# Welcome

This is your documentation home page.
`;

export const initCommand = new Command('init')
  .description('Initialize a new Chronicle project')
  .action(() => {
    const projectDir = process.cwd();
    const defaultDir = defaultConfig.content[0].dir;
    const contentDir = path.join(projectDir, 'content', defaultDir);

    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
      console.log(chalk.green('\u2713'), 'Created', contentDir);
    }

    const configPath = path.join(projectDir, 'chronicle.yaml');
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, stringify(defaultConfig));
      console.log(chalk.green('\u2713'), 'Created', configPath);
    } else {
      console.log(chalk.yellow('\u26a0'), configPath, 'already exists');
    }

    const contentFiles = fs.readdirSync(contentDir);
    if (contentFiles.length === 0) {
      const indexPath = path.join(contentDir, 'index.mdx');
      fs.writeFileSync(indexPath, sampleMdx);
      console.log(chalk.green('\u2713'), 'Created', indexPath);
    }

    const gitignorePath = path.join(projectDir, '.gitignore');
    const gitignoreEntries = ['node_modules', 'dist', '.output'];
    if (fs.existsSync(gitignorePath)) {
      const existing = fs.readFileSync(gitignorePath, 'utf-8');
      const missing = gitignoreEntries.filter(e => !existing.includes(e));
      if (missing.length > 0) {
        fs.appendFileSync(gitignorePath, `\n${missing.join('\n')}\n`);
        console.log(chalk.green('\u2713'), 'Added', missing.join(', '), 'to .gitignore');
      }
    } else {
      fs.writeFileSync(gitignorePath, `${gitignoreEntries.join('\n')}\n`);
      console.log(chalk.green('\u2713'), 'Created .gitignore');
    }

    console.log(chalk.green('\n\u2713 Chronicle initialized!'));
    console.log('\nRun', chalk.cyan('chronicle dev'), 'to start development server');
  });
