import { describe, expect, test } from 'bun:test';
import {
  isLocalImage,
  isSvg,
  buildOptimizedUrl,
  ALLOWED_WIDTHS,
  DEFAULT_WIDTH,
  DEFAULT_QUALITY,
} from './image-utils';

describe('isLocalImage', () => {
  test('returns true for /_content/ URLs', () => {
    expect(isLocalImage('/_content/docs/photo.png')).toBe(true);
  });

  test('returns false for external URLs', () => {
    expect(isLocalImage('https://example.com/img.png')).toBe(false);
  });

  test('returns false for relative URLs', () => {
    expect(isLocalImage('/images/logo.png')).toBe(false);
  });
});

describe('isSvg', () => {
  test('returns true for .svg files', () => {
    expect(isSvg('/_content/logo.svg')).toBe(true);
  });

  test('returns true for .svg with query string', () => {
    expect(isSvg('/_content/logo.svg?v=1')).toBe(true);
  });

  test('returns false for .png files', () => {
    expect(isSvg('/_content/photo.png')).toBe(false);
  });
});

describe('buildOptimizedUrl', () => {
  test('builds URL with width and default quality', () => {
    const url = buildOptimizedUrl('/_content/img.png', 640);
    expect(url).toBe(`/api/image?url=%2F_content%2Fimg.png&w=640&q=${DEFAULT_QUALITY}`);
  });

  test('builds URL with custom quality', () => {
    const url = buildOptimizedUrl('/_content/img.png', 320, 50);
    expect(url).toBe('/api/image?url=%2F_content%2Fimg.png&w=320&q=50');
  });

  test('encodes special characters in URL', () => {
    const url = buildOptimizedUrl('/_content/my image (1).png', 640);
    expect(url).toContain('my%20image%20(1).png');
  });
});

describe('constants', () => {
  test('ALLOWED_WIDTHS is sorted ascending', () => {
    for (let i = 1; i < ALLOWED_WIDTHS.length; i++) {
      expect(ALLOWED_WIDTHS[i]).toBeGreaterThan(ALLOWED_WIDTHS[i - 1]);
    }
  });

  test('DEFAULT_WIDTH is in ALLOWED_WIDTHS', () => {
    expect(ALLOWED_WIDTHS).toContain(DEFAULT_WIDTH);
  });

  test('DEFAULT_QUALITY is between 1 and 100', () => {
    expect(DEFAULT_QUALITY).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_QUALITY).toBeLessThanOrEqual(100);
  });
});
