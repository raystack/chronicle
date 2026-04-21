import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadCLIConfig } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';
import { linkContent } from '@/cli/utils/scaffold';

export const devCommand = new Command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('--config <path>', 'Path to chronicle.yaml')
  .option('--host <host>', 'Host address', 'localhost')
  .action(async options => {
    const { projectRoot, configPath } = await loadCLIConfig(options.config);
    const port = parseInt(options.port, 10);

    await linkContent(path.join(projectRoot, 'content'));

    console.log(chalk.cyan('Starting dev server...'));

    const { createServer } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const config = await createViteConfig({ packageRoot: PACKAGE_ROOT, projectRoot, configPath });
    const server = await createServer({
      ...config,
      server: { ...config.server, port, host: options.host }
    });

    await server.listen();
    server.printUrls();
  });
