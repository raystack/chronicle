import chalk from 'chalk';
import { Command } from 'commander';
import { resolveContentDir } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';

export const buildCommand = new Command('build')
  .description('Build for production')
  .option('-c, --content <path>', 'Content directory')
  .option(
    '--preset <preset>',
    'Deploy preset (vercel, cloudflare, node-server)'
  )
  .action(async options => {
    const contentDir = resolveContentDir(options.content);

    console.log(chalk.cyan('Building for production...'));

    const { build } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const config = await createViteConfig({
      root: PACKAGE_ROOT,
      contentDir,
      preset: options.preset
    });

    await build(config);

    console.log(chalk.green('Build complete'));
  });
