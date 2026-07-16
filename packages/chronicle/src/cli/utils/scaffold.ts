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
    await linkDir(source, dest);
  }

  for (const version of config.versions ?? []) {
    const versionMirror = path.join(mirrorRoot, version.dir);
    await fs.mkdir(versionMirror, { recursive: true });

    for (const root of getVersionContentRoots(config, version.dir)) {
      const source = path.resolve(projectRoot, root.fsPath);
      const dest = path.join(versionMirror, root.contentDir);
      await linkDir(source, dest);
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

async function linkDir(source: string, dest: string): Promise<void> {
  try {
    await fs.access(source);
  } catch {
    throw new Error(`Content directory not found: ${source}`);
  }
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  await fs.symlink(source, dest, type);
}

async function removeMirror(mirrorRoot: string): Promise<void> {
  try {
    const stat = await fs.lstat(mirrorRoot);
    if (stat.isSymbolicLink() || stat.isFile()) {
      await fs.unlink(mirrorRoot);
    } else if (stat.isDirectory()) {
      const entries = await fs.readdir(mirrorRoot, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(mirrorRoot, entry.name);
        const entryStat = await fs.lstat(entryPath);
        if (entryStat.isSymbolicLink()) {
          await fs.unlink(entryPath);
        } else if (entryStat.isDirectory()) {
          await cleanDirSymlinks(entryPath);
          await fs.rm(entryPath, { recursive: true, force: true });
        } else {
          await fs.unlink(entryPath);
        }
      }
      await fs.rm(mirrorRoot, { recursive: true, force: true });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}

async function cleanDirSymlinks(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    const entryStat = await fs.lstat(entryPath);
    if (entryStat.isSymbolicLink()) {
      await fs.unlink(entryPath);
    } else if (entryStat.isDirectory()) {
      await cleanDirSymlinks(entryPath);
    }
  }
}
