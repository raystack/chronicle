import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './resolve';

export function detectPackageManager(): string {
  if (process.env.npm_config_user_agent) {
    return process.env.npm_config_user_agent.split('/')[0];
  }
  const cwd = process.cwd();
  if (
    fs.existsSync(path.join(cwd, 'bun.lock')) ||
    fs.existsSync(path.join(cwd, 'bun.lockb'))
  )
    return 'bun';
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

export function getChronicleVersion(): string {
  const pkgPath = path.join(PACKAGE_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}
