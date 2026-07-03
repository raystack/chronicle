import { describe, expect, test } from 'bun:test';
import { assetCacheControl, etagFor, isNotModified } from './asset-cache';

describe('assetCacheControl', () => {
  test('returns immutable caching when requested version matches current', () => {
    expect(assetCacheControl('abc123', 'abc123')).toBe('public, max-age=31536000, immutable');
  });

  test('forces revalidation when no version is requested', () => {
    expect(assetCacheControl(null, 'abc123')).toBe('public, no-cache');
  });

  test('forces revalidation when requested version is stale', () => {
    expect(assetCacheControl('old111', 'abc123')).toBe('public, no-cache');
  });

  test('forces revalidation when current version is unknown', () => {
    expect(assetCacheControl('abc123', null)).toBe('public, no-cache');
  });
});

describe('etagFor', () => {
  test('joins parts into a quoted etag', () => {
    expect(etagFor('abc123', '640', 'webp')).toBe('"abc123-640-webp"');
  });

  test('single part etag', () => {
    expect(etagFor('abc123')).toBe('"abc123"');
  });
});

describe('isNotModified', () => {
  test('matches an exact etag', () => {
    expect(isNotModified('"abc123"', '"abc123"')).toBe(true);
  });

  test('does not match a different etag', () => {
    expect(isNotModified('"old111"', '"abc123"')).toBe(false);
  });

  test('returns false when header is missing', () => {
    expect(isNotModified(null, '"abc123"')).toBe(false);
  });

  test('matches within a list of etags', () => {
    expect(isNotModified('"one", "abc123"', '"abc123"')).toBe(true);
  });

  test('matches weak validators', () => {
    expect(isNotModified('W/"abc123"', '"abc123"')).toBe(true);
  });

  test('matches wildcard', () => {
    expect(isNotModified('*', '"abc123"')).toBe(true);
  });
});
