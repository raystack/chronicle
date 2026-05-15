import chalk from 'chalk';
import { Command } from 'commander';
import { loadCLIConfig } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';
import { linkContent } from '@/cli/utils/scaffold';

export const startCommand = new Command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('--config <path>', 'Path to chronicle.yaml')
  .option('--host <host>', 'Host address', 'localhost')
  .action(async options => {
    const { config, projectRoot, configPath } = await loadCLIConfig(options.config);
    const port = parseInt(options.port, 10);
    await linkContent(projectRoot, config);

    console.log(chalk.cyan('Starting production server...'));

    const { preview } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const viteConfig = await createViteConfig({ packageRoot: PACKAGE_ROOT, projectRoot, configPath });
    const server = await preview({
      ...viteConfig,
      preview: { port, host: options.host }
    });

    server.printUrls();

    const shutdown = () => process.exit(0);
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
