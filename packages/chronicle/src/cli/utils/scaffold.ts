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
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  await fs.symlink(source, dest, type);
}

// fs.rm removes symlinks without following them, so linked content is untouched
function removeMirror(mirrorRoot: string): Promise<void> {
  return fs.rm(mirrorRoot, { recursive: true, force: true });
}
