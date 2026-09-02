import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { stringify } from 'yaml';
import type { ChronicleConfig } from '@/types';

export const defaultInitConfig: ChronicleConfig = {
  site: {
    title: 'My Documentation',
    description: 'Documentation powered by Chronicle',
  },
  content: [{ dir: 'docs', label: 'Docs' }],
  theme: { name: 'default' },
  search: { enabled: true, placeholder: 'Search documentation...' }
};

// No `# Welcome` heading: every theme prints the frontmatter title above the
// article, so a heading here would show the same words twice.
const sampleMdx = `---
title: Welcome
description: Getting started with your documentation
order: 1
---

This is your documentation home page.
`;

const GITIGNORE_ENTRIES = ['node_modules', 'dist', '.output'];

export interface InitEvent {
  type: 'created' | 'skipped' | 'updated';
  path: string;
  detail?: string;
}

export function runInit(projectDir: string): InitEvent[] {
  const events: InitEvent[] = [];
  const defaultDir = defaultInitConfig.content[0].dir;
  const contentDir = path.join(projectDir, 'content', defaultDir);

  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
    events.push({ type: 'created', path: contentDir });
  }

  const configPath = path.join(projectDir, 'chronicle.yaml');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, stringify(defaultInitConfig));
    events.push({ type: 'created', path: configPath });
  } else {
    events.push({ type: 'skipped', path: configPath, detail: 'already exists' });
  }

  const contentFiles = fs.readdirSync(contentDir);
  if (contentFiles.length === 0) {
    const indexPath = path.join(contentDir, 'index.mdx');
    fs.writeFileSync(indexPath, sampleMdx);
    events.push({ type: 'created', path: indexPath });
  }

  const gitignorePath = path.join(projectDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, 'utf-8');
    const existingLines = new Set(
      existing.split(/\r?\n/).map(l => l.trim()).filter(Boolean),
    );
    const missing = GITIGNORE_ENTRIES.filter(e => !existingLines.has(e));
    if (missing.length > 0) {
      fs.appendFileSync(gitignorePath, `\n${missing.join('\n')}\n`);
      events.push({ type: 'updated', path: gitignorePath, detail: missing.join(', ') });
    }
  } else {
    fs.writeFileSync(gitignorePath, `${GITIGNORE_ENTRIES.join('\n')}\n`);
    events.push({ type: 'created', path: gitignorePath });
  }

  return events;
}

function formatEvent(e: InitEvent): string {
  if (e.type === 'skipped') {
    return `${chalk.yellow('⚠')} ${e.path}${e.detail ? ` ${e.detail}` : ''}`;
  }
  if (e.type === 'updated') {
    return `${chalk.green('✓')} Updated ${e.path}${e.detail ? ` (+${e.detail})` : ''}`;
  }
  return `${chalk.green('✓')} Created ${e.path}`;
}

export const initCommand = new Command('init')
  .description('Initialize a new Chronicle project')
  .action(() => {
    const events = runInit(process.cwd());
    for (const e of events) console.log(formatEvent(e));
    console.log(chalk.green('\n✓ Chronicle initialized!'));
    console.log(
      '\nRun',
      chalk.cyan('chronicle dev'),
      'to start development server',
    );
  });
