import chalk from 'chalk';
import { Command } from 'commander';
import { loadCLIConfig } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';
import { linkContent } from '@/cli/utils/scaffold';

export const startCommand = new Command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('--content <path>', 'Content directory')
  .option('--host <host>', 'Host address', 'localhost')
  .action(async options => {
    const { contentDir, configPath } = await loadCLIConfig(undefined, { content: options.content });
    const port = parseInt(options.port, 10);
    await linkContent(contentDir);

    console.log(chalk.cyan('Starting production server...'));

    const { preview } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const config = await createViteConfig({ packageRoot: PACKAGE_ROOT, projectRoot: process.cwd(), contentDir, configPath });
    const server = await preview({
      ...config,
      preview: { port, host: options.host }
    });

    server.printUrls();
  });
