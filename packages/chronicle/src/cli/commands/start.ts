import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadCLIConfig } from '@/cli/utils/config';

function resolveServerEntry(projectRoot: string, preset?: string): string {
  if (preset === 'vercel' || preset === 'vercel-static') {
    return path.resolve(projectRoot, '.vercel/output/server/index.mjs');
  }
  return path.resolve(projectRoot, '.output/server/index.mjs');
}

export const startCommand = new Command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('--config <path>', 'Path to chronicle.yaml')
  .option('--host <host>', 'Host address', '0.0.0.0')
  .option('--preset <preset>', 'Deploy preset (must match build preset)')
  .action(async options => {
    const { config, projectRoot } = await loadCLIConfig(options.config);
    const preset = options.preset ?? config.preset;
    const serverEntry = resolveServerEntry(projectRoot, preset);

    const exists = await fs.access(serverEntry).then(() => true, () => false);
    if (!exists) {
      console.error(chalk.red(`No build found at ${serverEntry}`));
      console.error(chalk.red('Run `chronicle build` first.'));
      process.exit(1);
    }

    console.log(chalk.cyan('Starting production server...'));

    const child = spawn(process.execPath, [serverEntry], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: options.port,
        HOST: options.host,
      },
    });

    let shuttingDown = false;
    const shutdown = () => {
      if (shuttingDown) return;
      shuttingDown = true;
      try {
        child.kill('SIGTERM');
      } catch { /* ignore if already exited */ }
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  });
