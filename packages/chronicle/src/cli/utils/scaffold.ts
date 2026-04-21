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
    const source = path.resolve(projectRoot, root.fsPath);
    const dest = path.join(mirrorRoot, root.contentDir);
    await mirrorTree(source, dest);
  }

  for (const version of config.versions ?? []) {
    const versionMirror = path.join(mirrorRoot, version.dir);
    await fs.mkdir(versionMirror, { recursive: true });

    for (const root of getVersionContentRoots(config, version.dir)) {
      const source = path.resolve(projectRoot, root.fsPath);
      const dest = path.join(versionMirror, root.contentDir);
      await mirrorTree(source, dest);
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

async function mirrorTree(source: string, dest: string): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(source, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  await fs.mkdir(dest, { recursive: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await mirrorTree(sourcePath, destPath);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      await fs.symlink(sourcePath, destPath);
    }
  }
}

async function removeMirror(mirrorRoot: string): Promise<void> {
  try {
    const stat = await fs.lstat(mirrorRoot);
    if (stat.isSymbolicLink() || stat.isFile()) {
      await fs.unlink(mirrorRoot);
    } else if (stat.isDirectory()) {
      await fs.rm(mirrorRoot, { recursive: true, force: true });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}
