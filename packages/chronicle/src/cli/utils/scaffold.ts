import fs from 'node:fs/promises';
import path from 'node:path';
import type { ChronicleConfig } from '@/types';
import { getLatestContentRoots, getVersionContentRoots } from '@/lib/config';
import { PACKAGE_ROOT } from './resolve';

export async function buildContentMirror(
  mirrorRoot: string,
  projectRoot: string,
  config: ChronicleConfig,
): Promise<void> {
  await removeMirror(mirrorRoot);
  await fs.mkdir(mirrorRoot, { recursive: true });

  for (const root of getLatestContentRoots(config)) {
    const target = path.resolve(projectRoot, root.fsPath);
    const linkPath = path.join(mirrorRoot, root.contentDir);
    await fs.symlink(target, linkPath);
  }

  for (const version of config.versions ?? []) {
    const versionMirror = path.join(mirrorRoot, version.dir);
    await fs.mkdir(versionMirror, { recursive: true });

    for (const root of getVersionContentRoots(config, version.dir)) {
      const target = path.resolve(projectRoot, root.fsPath);
      const linkPath = path.join(versionMirror, root.contentDir);
      await fs.symlink(target, linkPath);
    }
  }
}

export function linkContent(
  projectRoot: string,
  config: ChronicleConfig,
): Promise<void> {
  return buildContentMirror(
    path.join(PACKAGE_ROOT, '.content'),
    projectRoot,
    config,
  );
}

async function removeMirror(mirrorRoot: string): Promise<void> {
  try {
    const stat = await fs.lstat(mirrorRoot);
    if (stat.isSymbolicLink() || stat.isFile()) {
      await fs.unlink(mirrorRoot);
    } else if (stat.isDirectory()) {
      await fs.rm(mirrorRoot, { recursive: true, force: true });
    }
  } catch {
    // mirror doesn't exist
  }
}
