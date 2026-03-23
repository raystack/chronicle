import chalk from 'chalk';
import { Command } from 'commander';
import { resolveContentDir } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';

export const startCommand = new Command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .action(async options => {
    const contentDir = resolveContentDir(options.content);
    const port = parseInt(options.port, 10);

    console.log(chalk.cyan('Starting production server...'));

    const { preview } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const config = await createViteConfig({ root: PACKAGE_ROOT, contentDir });
    const server = await preview({
      ...config,
      preview: { port }
    });

    server.printUrls();
  });
