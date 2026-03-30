import fs from 'node:fs/promises';
import path from 'node:path';
import { PACKAGE_ROOT } from './resolve';

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
