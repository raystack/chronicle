import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { parse } from 'yaml';
import { chronicleConfigSchema, type ChronicleConfig } from '@/types';

export interface CLIConfig {
  config: ChronicleConfig;
  configPath: string;
  contentDir: string;
  preset?: string;
}

export function resolveConfigPath(configPath?: string): string | undefined {
  if (configPath) return path.resolve(configPath);
  return undefined;
}

async function readConfig(configPath: string): Promise<string> {
  return fs.readFile(configPath, 'utf-8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') {
      console.log(chalk.red(`Error: chronicle.yaml not found at '${configPath}'`));
      console.log(chalk.gray("Run 'chronicle init' to create one"));
    } else {
      console.log(chalk.red(`Error: Failed to read '${configPath}'`));
      console.log(chalk.gray(error.message));
    }
    process.exit(1);
  });
}

function validateConfig(raw: string, configPath: string): ChronicleConfig {
  const parsed = parse(raw);
  const result = chronicleConfigSchema.safeParse(parsed);

  if (!result.success) {
    console.log(chalk.red(`Error: Invalid chronicle.yaml at '${configPath}'`));
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      console.log(chalk.gray(`  ${path ? `${path}: ` : ''}${issue.message}`));
    }
    process.exit(1);
  }

  return result.data;
}

export function resolveContentDir(config: ChronicleConfig, configPath: string, contentFlag?: string): string {
  if (contentFlag) return path.resolve(contentFlag);
  if (config.content) return path.resolve(path.dirname(configPath), config.content);
  return path.resolve('content');
}

export function resolvePreset(config: ChronicleConfig, presetFlag?: string): string | undefined {
  return presetFlag ?? config.preset;
}

export async function loadCLIConfig(
  configPath?: string,
  options?: { content?: string; preset?: string }
): Promise<CLIConfig> {
  const resolvedConfigPath = resolveConfigPath(configPath)
    ?? path.join(process.cwd(), 'chronicle.yaml');

  const raw = await readConfig(resolvedConfigPath);
  const config = validateConfig(raw, resolvedConfigPath);
  const contentDir = resolveContentDir(config, resolvedConfigPath, options?.content);
  const preset = resolvePreset(config, options?.preset);

  return { config, configPath: resolvedConfigPath, contentDir, preset };
}
