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
  .option('--preset <preset>', 'Deploy preset (bun, node-server, etc.)')
  .action(async options => {
    const { config, projectRoot, configPath } = await loadCLIConfig(options.config);
    const port = parseInt(options.port, 10);

    await linkContent(projectRoot, config);

    // Nitro 3's default node-worker runner fails on Windows due to Vite 8 environment API incompatibility
    if (process.platform === 'win32' && !process.env.NITRO_DEV_RUNNER) {
      process.env.NITRO_DEV_RUNNER = 'node-process';
    }

    console.log(chalk.cyan('Starting dev server...'));

    const { createServer } = await import('vite');
    const { createViteConfig } = await import('@/server/vite-config');

    const viteConfig = await createViteConfig({ packageRoot: PACKAGE_ROOT, projectRoot, configPath, preset: options.preset });
    const server = await createServer({
      ...viteConfig,
      server: { ...viteConfig.server, port, host: options.host }
    });

    await server.listen();
    server.printUrls();

    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      try {
        await server.close();
      } catch { /* ignore close errors */ }
      process.exit(0);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
