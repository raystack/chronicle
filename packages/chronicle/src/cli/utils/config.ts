import fs from 'node:fs/promises';
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

export function resolveConfigPath(configPath?: string): string | undefined {
  if (configPath) return path.resolve(configPath);
  return undefined;
}

async function readConfig(configPath: string): Promise<ChronicleConfig> {
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    return parse(raw) as ChronicleConfig;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      console.log(chalk.red(`Error: chronicle.yaml not found at '${configPath}'`));
      console.log(chalk.gray("Run 'chronicle init' to create one"));
    } else {
      console.log(chalk.red(`Error: Invalid YAML in '${configPath}'`));
      console.log(chalk.gray(err.message));
    }
    process.exit(1);
  }
}

export async function loadCLIConfig(contentDir: string, configPath?: string): Promise<CLIConfig> {
  const resolvedConfigPath = resolveConfigPath(configPath)
    ?? path.join(process.cwd(), 'chronicle.yaml');

  const config = await readConfig(resolvedConfigPath);
  return { config, configPath: resolvedConfigPath, contentDir };
}
