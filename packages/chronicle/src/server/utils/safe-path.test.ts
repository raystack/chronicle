import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { safePath } from '@/server/utils/safe-path';

describe('safePath', () => {
  const base = '/app/content';

  test('resolves valid path within base', () => {
    expect(safePath(base, '/docs/intro.mdx')).toBe(path.resolve(base, 'docs/intro.mdx'));
  });

  test('returns null for path traversal', () => {
    expect(safePath(base, '/../etc/passwd')).toBeNull();
  });

  test('normalizes backslashes to forward slashes', () => {
    const result = safePath(base, '/docs\\imgs\\screenshot.png');
    expect(result).toBe(path.resolve(base, 'docs/imgs/screenshot.png'));
  });

  test('decodes URI-encoded characters', () => {
    const result = safePath(base, '/docs/my%20image.png');
    expect(result).toBe(path.resolve(base, 'docs/my image.png'));
  });

  test('strips query string before resolving', () => {
    const result = safePath(base, '/docs/img.png?v=1');
    expect(result).toBe(path.resolve(base, 'docs/img.png'));
  });

  test('returns null for malformed percent-encoding', () => {
    expect(safePath(base, '/docs/%E0%A4%')).toBeNull();
  });
});
