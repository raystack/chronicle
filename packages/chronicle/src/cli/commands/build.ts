import chalk from 'chalk';
import { Command } from 'commander';
import { resolveConfigPath, resolveContentDir } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';
import { linkContent } from '@/cli/utils/scaffold';

export const buildCommand = new Command('build')
  .description('Build for production')
  .option('--content <path>', 'Content directory')
  .option('--config <path>', 'Path to chronicle.yaml')
  .option(
    '--preset <preset>',
    'Deploy preset (vercel, cloudflare, node-server)'
  )
  .action(async options => {
    const contentDir = resolveContentDir(options.content);
    const configPath = resolveConfigPath(options.config);
    await linkContent(contentDir);

    console.log(chalk.cyan('Building for production...'));

    const { createBuilder } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const config = await createViteConfig({
      packageRoot: PACKAGE_ROOT,
      projectRoot: process.cwd(),
      contentDir,
      configPath: configPath ?? undefined,
      preset: options.preset
    });

    const builder = await createBuilder({ ...config, builder: {} });
    await builder.buildApp();

    console.log(chalk.green('Build complete'));
    console.log(chalk.cyan('Run `chronicle start` to start the server'));
  });
