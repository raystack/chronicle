import { describe, expect, test } from 'bun:test';
import { negotiateFormat, cacheKey, MIME } from './image';

describe('negotiateFormat', () => {
  test('returns avif when Accept includes image/avif', () => {
    expect(negotiateFormat('image/avif,image/webp,*/*')).toBe('avif');
  });

  test('returns webp when Accept includes image/webp but not avif', () => {
    expect(negotiateFormat('image/webp,image/png,*/*')).toBe('webp');
  });

  test('returns original when Accept has neither avif nor webp', () => {
    expect(negotiateFormat('image/png,*/*')).toBe('original');
  });

  test('returns original for null Accept header', () => {
    expect(negotiateFormat(null)).toBe('original');
  });

  test('prefers avif over webp when both present', () => {
    expect(negotiateFormat('image/webp,image/avif')).toBe('avif');
  });
});

describe('cacheKey', () => {
  test('returns deterministic key for same inputs', () => {
    const a = cacheKey('/_content/img.png', 640, 75, 'webp');
    const b = cacheKey('/_content/img.png', 640, 75, 'webp');
    expect(a).toBe(b);
  });

  test('returns different keys for different widths', () => {
    const a = cacheKey('/_content/img.png', 640, 75, 'webp');
    const b = cacheKey('/_content/img.png', 1024, 75, 'webp');
    expect(a).not.toBe(b);
  });

  test('returns different keys for different formats', () => {
    const a = cacheKey('/_content/img.png', 640, 75, 'webp');
    const b = cacheKey('/_content/img.png', 640, 75, 'avif');
    expect(a).not.toBe(b);
  });

  test('returns different keys for different quality', () => {
    const a = cacheKey('/_content/img.png', 640, 75, 'webp');
    const b = cacheKey('/_content/img.png', 640, 50, 'webp');
    expect(a).not.toBe(b);
  });

  test('returns different keys for different mtime', () => {
    const a = cacheKey('/_content/img.png', 640, 75, 'webp', 1000);
    const b = cacheKey('/_content/img.png', 640, 75, 'webp', 2000);
    expect(a).not.toBe(b);
  });

  test('key ends with format extension', () => {
    expect(cacheKey('/_content/img.png', 640, 75, 'webp')).toMatch(/\.webp$/);
    expect(cacheKey('/_content/img.png', 640, 75, 'avif')).toMatch(/\.avif$/);
    expect(cacheKey('/_content/img.png', 640, 75, 'original')).toMatch(/\.original$/);
  });
});

describe('MIME', () => {
  test('maps common image extensions', () => {
    expect(MIME['.png']).toBe('image/png');
    expect(MIME['.jpg']).toBe('image/jpeg');
    expect(MIME['.jpeg']).toBe('image/jpeg');
    expect(MIME['.gif']).toBe('image/gif');
    expect(MIME['.webp']).toBe('image/webp');
  });

  test('does not include svg (handled separately)', () => {
    expect(MIME['.svg']).toBeUndefined();
  });
});
