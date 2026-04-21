import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadCLIConfig } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';
import { linkContent } from '@/cli/utils/scaffold';

export const serveCommand = new Command('serve')
  .description('Build and start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('--config <path>', 'Path to chronicle.yaml')
  .option('--host <host>', 'Host address', 'localhost')
  .option(
    '--preset <preset>',
    'Deploy preset (vercel, cloudflare, node-server)'
  )
  .action(async options => {
    const { projectRoot, configPath, preset } = await loadCLIConfig(options.config, {
      preset: options.preset,
    });
    const port = parseInt(options.port, 10);
    await linkContent(path.join(projectRoot, 'content'));

    const { build, preview } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const config = await createViteConfig({
      packageRoot: PACKAGE_ROOT,
      projectRoot,
      configPath,
      preset
    });

    console.log(chalk.cyan('Building for production...'));
    await build(config);

    console.log(chalk.cyan('Starting production server...'));
    const server = await preview({
      ...config,
      preview: { port, host: options.host }
    });

    server.printUrls();
  });
