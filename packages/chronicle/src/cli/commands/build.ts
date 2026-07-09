import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadCLIConfig } from '@/cli/utils/config';
import { PACKAGE_ROOT } from '@/cli/utils/resolve';
import { linkContent } from '@/cli/utils/scaffold';

export const buildCommand = new Command('build')
  .description('Build for production')
  .option('--config <path>', 'Path to chronicle.yaml')
  .option(
    '--preset <preset>',
    'Deploy preset (vercel, cloudflare, node-server, static)'
  )
  .action(async options => {
    const { config, projectRoot, configPath, preset } = await loadCLIConfig(options.config, {
      preset: options.preset,
    });
    await linkContent(projectRoot, config);

    console.log(chalk.cyan('Building for production...'));

    const { createBuilder, build } = await import('vite');
    const { createViteConfig, isStaticPreset } = await import('@/server/vite-config');

    const viteConfig = await createViteConfig({
      packageRoot: PACKAGE_ROOT,
      projectRoot,
      configPath,
      preset
    });

    try {
      if (isStaticPreset(preset)) {
        await build(viteConfig);
      } else {
        const builder = await createBuilder({ ...viteConfig, builder: {} });
        await builder.buildApp();
      }

      if (isStaticPreset(preset)) {
        const { generateStaticSite } = await import('@/cli/commands/static-generate');
        const outputDir = path.resolve(projectRoot, '.output/public');

        await generateStaticSite({
          projectRoot,
          config,
          outputDir,
          packageRoot: PACKAGE_ROOT,
        });

        console.log(chalk.green('Static build complete'));
        console.log(chalk.cyan(`Output: ${outputDir}`));
      } else {
        console.log(chalk.green('Build complete'));
        console.log(chalk.cyan('Run `chronicle start` to start the server'));
      }
    } catch (err) {
      const { printMdxBuildError } = await import('@/cli/utils/mdx-error-report');
      if (await printMdxBuildError(err, PACKAGE_ROOT)) {
        console.error(chalk.red('Build failed'));
        process.exit(1);
      }
      throw err;
    }
  });
