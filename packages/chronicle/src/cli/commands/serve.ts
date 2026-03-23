import chalk from 'chalk';
import { Command } from 'commander';
import { resolveContentDir } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';

export const serveCommand = new Command('serve')
  .description('Build and start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-c, --content <path>', 'Content directory')
  .option(
    '--preset <preset>',
    'Deploy preset (vercel, cloudflare, node-server)'
  )
  .action(async options => {
    const contentDir = resolveContentDir(options.content);
    const port = parseInt(options.port, 10);

    const { build, preview } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const config = await createViteConfig({
      root: PACKAGE_ROOT,
      contentDir,
      preset: options.preset
    });

    console.log(chalk.cyan('Building for production...'));
    await build(config);

    console.log(chalk.cyan('Starting production server...'));
    const server = await preview({
      ...config,
      preview: { port }
    });

    server.printUrls();
  });
