import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { negotiateFormat, cacheKey, MIME, optimizeImage } from './image';

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

  test('downgrades avif to webp for animated sources', () => {
    expect(negotiateFormat('image/avif,image/webp,*/*', true)).toBe('webp');
  });

  test('returns webp for animated sources when only avif is advertised', () => {
    expect(negotiateFormat('image/avif,*/*', true)).toBe('webp');
  });

  test('returns webp for animated sources when webp is advertised', () => {
    expect(negotiateFormat('image/webp,image/png,*/*', true)).toBe('webp');
  });

  test('returns original for animated sources with neither format', () => {
    expect(negotiateFormat('image/png,*/*', true)).toBe('original');
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

  test('returns different keys for different content hashes', () => {
    const a = cacheKey('/_content/img.png', 640, 75, 'webp', 'aaaa111111');
    const b = cacheKey('/_content/img.png', 640, 75, 'webp', 'bbbb222222');
    expect(a).not.toBe(b);
  });

  test('returns same key for same content hash', () => {
    const a = cacheKey('/_content/img.png', 640, 75, 'webp', 'aaaa111111');
    const b = cacheKey('/_content/img.png', 640, 75, 'webp', 'aaaa111111');
    expect(a).toBe(b);
  });

  test('returns different keys for animated and still variants', () => {
    const still = cacheKey('/_content/tour.gif', 1024, 75, 'webp', 'aaaa111111');
    const animated = cacheKey('/_content/tour.gif', 1024, 75, 'webp', 'aaaa111111', true);
    expect(animated).not.toBe(still);
  });

  test('leaves still-image keys unchanged when animated defaults to false', () => {
    const implicit = cacheKey('/_content/img.png', 1024, 75, 'webp', 'aaaa111111');
    const explicit = cacheKey('/_content/img.png', 1024, 75, 'webp', 'aaaa111111', false);
    expect(explicit).toBe(implicit);
  });

  test('key ends with format extension', () => {
    expect(cacheKey('/_content/img.png', 640, 75, 'webp')).toMatch(/\.webp$/);
    expect(cacheKey('/_content/img.png', 640, 75, 'avif')).toMatch(/\.avif$/);
    expect(cacheKey('/_content/img.png', 640, 75, 'original')).toMatch(/\.original$/);
  });
});

describe('optimizeImage with animated sources', () => {
  let dir: string;
  let gif: string;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'chronicle-image-'));
    gif = path.join(dir, 'tour.gif');
    const frames = await Promise.all(
      ['#f00', '#00f', '#0f0'].map(background =>
        sharp({ create: { width: 8, height: 8, channels: 3, background } }).png().toBuffer(),
      ),
    );
    await fs.writeFile(gif, await sharp(frames, { join: { animated: true } }).gif().toBuffer());
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  async function pages(buf: Buffer): Promise<number> {
    return (await sharp(buf).metadata()).pages ?? 1;
  }

  test('keeps every frame on webp output', async () => {
    expect(await pages(await optimizeImage(gif, 320, 75, 'webp', true))).toBe(3);
  });

  test('keeps every frame on original-format output', async () => {
    expect(await pages(await optimizeImage(gif, 320, 75, 'original', true))).toBe(3);
  });

  test('flattens to one frame when animated is not set', async () => {
    expect(await pages(await optimizeImage(gif, 320, 75, 'webp'))).toBe(1);
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
