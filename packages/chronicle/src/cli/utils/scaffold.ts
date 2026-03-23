import fs from 'node:fs/promises';
import path from 'node:path';
import { PACKAGE_ROOT } from './resolve';

export async function detectPackageManager(): Promise<string> {
  if (process.env.npm_config_user_agent) {
    return process.env.npm_config_user_agent.split('/')[0];
  }
  const cwd = process.cwd();
  const exists = async (p: string) =>
    fs.access(p).then(() => true).catch(() => false);

  if (await exists(path.join(cwd, 'bun.lock')) || await exists(path.join(cwd, 'bun.lockb')))
    return 'bun';
  if (await exists(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await exists(path.join(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

export async function getChronicleVersion(): Promise<string> {
  const pkgPath = path.join(PACKAGE_ROOT, 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf-8');
  return JSON.parse(raw).version;
}

export async function linkContent(contentDir: string): Promise<void> {
  const linkPath = path.join(PACKAGE_ROOT, '.content');
  const target = path.resolve(contentDir);

  try {
    const existing = await fs.readlink(linkPath);
    if (existing === target) return;
    await fs.unlink(linkPath);
  } catch {
    // link doesn't exist
  }

  await fs.symlink(target, linkPath);
}
