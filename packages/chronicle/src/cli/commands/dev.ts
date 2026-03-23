import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { resolveContentDir } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';
import { linkContent } from '@/cli/utils/scaffold';

export const devCommand = new Command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .action(async options => {
    const contentDir = resolveContentDir(options.content);
    const port = parseInt(options.port, 10);

    await linkContent(contentDir);

    console.log(chalk.cyan('Starting dev server...'));

    const { createServer } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const config = await createViteConfig({ packageRoot: PACKAGE_ROOT, projectRoot: process.cwd(), contentDir });
    const server = await createServer({
      ...config,
      server: { ...config.server, port }
    });

    await server.listen();
    server.printUrls();
  });
