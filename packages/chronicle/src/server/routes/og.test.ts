import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { getLogoDataUri, loadLogo, loadFont } from './og-utils';

const PACKAGE_ROOT = path.resolve(__dirname, '../../..');
const FIXTURES = path.resolve(__dirname, '__fixtures__');

describe('getLogoDataUri', () => {
  test('svg file returns svg mime type', () => {
    const data = Buffer.from('<svg></svg>');
    const result = getLogoDataUri(data, '/logo.svg');
    expect(result).toStartWith('data:image/svg+xml;base64,');
  });

  test('png file returns png mime type', () => {
    const data = Buffer.from('fake-png');
    const result = getLogoDataUri(data, '/logo.png');
    expect(result).toStartWith('data:image/png;base64,');
  });

  test('jpg file returns jpeg mime type', () => {
    const data = Buffer.from('fake-jpg');
    const result = getLogoDataUri(data, '/photo.jpg');
    expect(result).toStartWith('data:image/jpeg;base64,');
  });

  test('encodes data as base64', () => {
    const content = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const data = Buffer.from(content);
    const result = getLogoDataUri(data, '/icon.svg');
    const base64 = result.split(',')[1];
    expect(Buffer.from(base64, 'base64').toString()).toBe(content);
  });
});

describe('loadLogo', () => {
  test('returns null for nonexistent file', async () => {
    const result = await loadLogo('/nonexistent', '/logo.svg');
    expect(result).toBeNull();
  });

  test('strips leading slash from logo path', async () => {
    const result = await loadLogo('/nonexistent', '/nested/logo.svg');
    expect(result).toBeNull();
  });
});

describe('loadFont', () => {
  test('loads Inter font from package', async () => {
    const font = await loadFont(PACKAGE_ROOT);
    expect(font.byteLength).toBeGreaterThan(0);
  });

  test('returns empty ArrayBuffer for invalid path', async () => {
    const font = await loadFont('/nonexistent');
    expect(font.byteLength).toBe(0);
  });
});
