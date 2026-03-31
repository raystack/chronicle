import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { parse } from 'yaml';
import type { ChronicleConfig } from '@/types';

export interface CLIConfig {
  config: ChronicleConfig;
  configPath: string;
  contentDir: string;
}

export function resolveContentDir(contentFlag?: string): string {
  if (contentFlag) return path.resolve(contentFlag);
  return path.resolve('content');
}

function resolveConfigPath(): string | null {
  const cwdPath = path.join(process.cwd(), 'chronicle.yaml');
  if (fs.existsSync(cwdPath)) return cwdPath;
  return null;
}

export function loadCLIConfig(contentDir: string): CLIConfig {
  const configPath = resolveConfigPath();

  if (!configPath) {
    console.log(
      chalk.red(
        `Error: chronicle.yaml not found in '${process.cwd()}'`
      )
    );
    console.log(chalk.gray("Run 'chronicle init' to create one"));
    process.exit(1);
  }

  const config = parse(fs.readFileSync(configPath, 'utf-8')) as ChronicleConfig;

  return { config, configPath, contentDir };
}
