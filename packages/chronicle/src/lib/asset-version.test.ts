import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashContent, getAssetVersion } from './asset-version';

function tempFile(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-asset-'));
  const file = path.join(dir, 'image.png');
  fs.writeFileSync(file, content);
  return file;
}

describe('hashContent', () => {
  test('returns a short hex hash', () => {
    expect(hashContent('hello')).toMatch(/^[0-9a-f]{10}$/);
  });

  test('is deterministic for same content', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'));
  });

  test('differs for different content', () => {
    expect(hashContent('hello')).not.toBe(hashContent('world'));
  });
});

describe('getAssetVersion', () => {
  test('returns the content hash of a file', async () => {
    const file = tempFile('image-bytes-v1');
    expect(await getAssetVersion(file)).toBe(hashContent('image-bytes-v1'));
  });

  test('returns the same hash on repeated calls', async () => {
    const file = tempFile('image-bytes-v1');
    expect(await getAssetVersion(file)).toBe(await getAssetVersion(file));
  });

  test('returns a new hash when the file content changes', async () => {
    const file = tempFile('image-bytes-v1');
    const before = await getAssetVersion(file);
    fs.writeFileSync(file, 'image-bytes-v2');
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(file, future, future);
    const after = await getAssetVersion(file);
    expect(after).toBe(hashContent('image-bytes-v2'));
    expect(after).not.toBe(before);
  });

  test('detects replace-by-rename with same size and mtime', async () => {
    const file = tempFile('same-size-A');
    const before = await getAssetVersion(file);
    const mtime = fs.statSync(file).mtime;
    const replacement = `${file}.tmp`;
    fs.writeFileSync(replacement, 'same-size-B');
    fs.utimesSync(replacement, mtime, mtime);
    fs.renameSync(replacement, file);
    fs.utimesSync(file, mtime, mtime);
    const after = await getAssetVersion(file);
    expect(after).toBe(hashContent('same-size-B'));
    expect(after).not.toBe(before);
  });

  test('returns null for a missing file', async () => {
    expect(await getAssetVersion('/nonexistent/path/image.png')).toBeNull();
  });
});
