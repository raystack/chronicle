import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadCLIConfig } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';
import { linkContent } from '@/cli/utils/scaffold';

export const startCommand = new Command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('--host <host>', 'Host address', 'localhost')
  .action(async options => {
    const { projectRoot, configPath } = await loadCLIConfig();
    const port = parseInt(options.port, 10);
    await linkContent(path.join(projectRoot, 'content'));

    console.log(chalk.cyan('Starting production server...'));

    const { preview } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const config = await createViteConfig({ packageRoot: PACKAGE_ROOT, projectRoot, configPath });
    const server = await preview({
      ...config,
      preview: { port, host: options.host }
    });

    server.printUrls();
  });
