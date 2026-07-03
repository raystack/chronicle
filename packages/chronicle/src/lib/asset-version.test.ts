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
  test('returns the content hash of a file', () => {
    const file = tempFile('image-bytes-v1');
    expect(getAssetVersion(file)).toBe(hashContent('image-bytes-v1'));
  });

  test('returns the same hash on repeated calls', () => {
    const file = tempFile('image-bytes-v1');
    expect(getAssetVersion(file)).toBe(getAssetVersion(file));
  });

  test('returns a new hash when the file content changes', () => {
    const file = tempFile('image-bytes-v1');
    const before = getAssetVersion(file);
    fs.writeFileSync(file, 'image-bytes-v2');
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(file, future, future);
    const after = getAssetVersion(file);
    expect(after).toBe(hashContent('image-bytes-v2'));
    expect(after).not.toBe(before);
  });

  test('returns null for a missing file', () => {
    expect(getAssetVersion('/nonexistent/path/image.png')).toBeNull();
  });
});
