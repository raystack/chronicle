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

export async function loadCLIConfig(contentDir: string, configPath?: string): Promise<CLIConfig> {
  const resolvedConfigPath = resolveConfigPath(configPath)
    ?? path.join(process.cwd(), 'chronicle.yaml');

  try {
    const raw = await fs.readFile(resolvedConfigPath, 'utf-8');
    const config = parse(raw) as ChronicleConfig;
    return { config, configPath: resolvedConfigPath, contentDir };
  } catch {
    console.log(
      chalk.red(`Error: chronicle.yaml not found at '${resolvedConfigPath}'`)
    );
    console.log(chalk.gray("Run 'chronicle init' to create one"));
    process.exit(1);
  }
}
