import { describe, expect, test } from 'bun:test';
import {
  isLocalImage,
  isSvg,
  isAnimatable,
  buildOptimizedUrl,
  webpUrl,
  splitVersion,
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

describe('isAnimatable', () => {
  test('returns true for .gif and .webp', () => {
    expect(isAnimatable('/_content/tour.gif')).toBe(true);
    expect(isAnimatable('/_content/tour.webp')).toBe(true);
  });

  test('ignores case and query strings', () => {
    expect(isAnimatable('/_content/TOUR.GIF?v=abc123')).toBe(true);
  });

  test('returns false for still-only formats', () => {
    expect(isAnimatable('/_content/photo.png')).toBe(false);
    expect(isAnimatable('/_content/photo.jpg')).toBe(false);
    expect(isAnimatable('/_content/logo.svg')).toBe(false);
  });

  test('works on filesystem paths', () => {
    expect(isAnimatable('/abs/path/.content/docs/tour.gif')).toBe(true);
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

describe('buildOptimizedUrl with version', () => {
  test('appends v param when version is provided', () => {
    const url = buildOptimizedUrl('/_content/img.png', 640, 75, 'abc123def0');
    expect(url).toBe('/api/image?url=%2F_content%2Fimg.png&w=640&q=75&v=abc123def0');
  });

  test('omits v param when version is undefined', () => {
    const url = buildOptimizedUrl('/_content/img.png', 640, 75);
    expect(url).toBe('/api/image?url=%2F_content%2Fimg.png&w=640&q=75');
  });
});

describe('webpUrl', () => {
  test('replaces the extension with .webp', () => {
    expect(webpUrl('/_content/photo.png')).toBe('/_content/photo.webp');
  });

  test('preserves the query string', () => {
    expect(webpUrl('/_content/photo.png?v=abc123def0')).toBe('/_content/photo.webp?v=abc123def0');
  });

  test('handles dots in directory names', () => {
    expect(webpUrl('/_content/v1.2/photo.jpeg?v=abc')).toBe('/_content/v1.2/photo.webp?v=abc');
  });
});

describe('splitVersion', () => {
  test('separates the base URL from the v param', () => {
    expect(splitVersion('/_content/img.png?v=abc123')).toEqual({
      base: '/_content/img.png',
      version: 'abc123',
    });
  });

  test('returns undefined version when there is no query', () => {
    expect(splitVersion('/_content/img.png')).toEqual({
      base: '/_content/img.png',
      version: undefined,
    });
  });

  test('returns undefined version when query has no v param', () => {
    expect(splitVersion('/_content/img.png?w=640')).toEqual({
      base: '/_content/img.png',
      version: undefined,
    });
  });
});

describe('buildOptimizedUrl with backslashes', () => {
  test('backslashes in input are not double-encoded', () => {
    const url = buildOptimizedUrl('/_content/docs/imgs\\screenshot.png', 640);
    expect(url).toContain('imgs%5Cscreenshot.png');
    expect(url).not.toContain('%255C');
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
