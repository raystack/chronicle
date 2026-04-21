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
    const { config, projectRoot, configPath, preset } = await loadCLIConfig(options.config, {
      preset: options.preset,
    });
    const port = parseInt(options.port, 10);
    await linkContent(projectRoot, config);

    const { build, preview } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const viteConfig = await createViteConfig({
      packageRoot: PACKAGE_ROOT,
      projectRoot,
      configPath,
      preset
    });

    console.log(chalk.cyan('Building for production...'));
    await build(viteConfig);

    console.log(chalk.cyan('Starting production server...'));
    const server = await preview({
      ...viteConfig,
      preview: { port, host: options.host }
    });

    server.printUrls();
  });
