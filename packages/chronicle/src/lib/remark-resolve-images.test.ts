import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Image, Html, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import remarkResolveImages from './remark-resolve-images';
import { hashContent } from './asset-version';

const PNG_BYTES = 'fake-png-bytes';
const SVG_BYTES = '<svg></svg>';
const PNG_HASH = hashContent(PNG_BYTES);
const SVG_HASH = hashContent(SVG_BYTES);

function setupContentDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-remark-'));
  const contentDir = path.join(root, 'content');
  fs.mkdirSync(path.join(contentDir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(contentDir, 'docs', 'img.png'), PNG_BYTES);
  fs.writeFileSync(path.join(contentDir, 'logo.svg'), SVG_BYTES);
  return contentDir;
}

async function transform(
  markdown: string,
  options?: { optimize?: boolean },
  contentDir = setupContentDir(),
  filePath = path.join(contentDir, 'docs', 'page.mdx')
) {
  const processor = unified().use(remarkParse).use(remarkResolveImages, options);
  const file: { path: string; data: { images?: string[] } } = {
    path: filePath,
    data: {},
  };
  const tree = processor.parse(markdown);
  const transformed = (await processor.run(tree, file as never)) as unknown as Root;
  return { tree: transformed, file };
}

function firstImageUrl(tree: Root): string {
  let url = '';
  visit(tree, 'image', (node: Image) => {
    if (!url) url = node.url;
  });
  return url;
}

function firstHtmlValue(tree: Root): string {
  let value = '';
  visit(tree, 'html', (node: Html) => {
    if (!value) value = node.value;
  });
  return value;
}

describe('remark-resolve-images version stamping', () => {
  test('appends content hash to resolved local images when not optimizing', async () => {
    const { tree } = await transform('![alt](./img.png)', { optimize: false });
    expect(firstImageUrl(tree)).toBe(`/_content/docs/img.png?v=${PNG_HASH}`);
  });

  test('threads content hash into optimized image URLs', async () => {
    const { tree } = await transform('![alt](./img.png)', { optimize: true });
    expect(firstImageUrl(tree)).toBe(
      `/api/image?url=%2F_content%2Fdocs%2Fimg.png&w=1024&q=75&v=${PNG_HASH}`
    );
  });

  test('appends content hash to svg images even when optimizing', async () => {
    const { tree } = await transform('![alt](/logo.svg)', { optimize: true });
    expect(firstImageUrl(tree)).toBe(`/_content/logo.svg?v=${SVG_HASH}`);
  });

  test('leaves external URLs untouched', async () => {
    const { tree } = await transform('![alt](https://example.com/img.png)', { optimize: false });
    expect(firstImageUrl(tree)).toBe('https://example.com/img.png');
  });

  test('omits version for missing files but still resolves the URL', async () => {
    const { tree } = await transform('![alt](./missing.png)', { optimize: false });
    expect(firstImageUrl(tree)).toBe('/_content/docs/missing.png');
  });

  test('stamps versions on img tags inside raw html', async () => {
    const { tree } = await transform('<img src="./img.png" alt="x" />', { optimize: false });
    expect(firstHtmlValue(tree)).toContain(`/_content/docs/img.png?v=${PNG_HASH}`);
  });

  test('collects versioned plain URLs in file.data.images', async () => {
    const { file } = await transform('![alt](./img.png)\n\n![alt](/logo.svg)', { optimize: true });
    expect(file.data.images).toEqual([
      `/_content/docs/img.png?v=${PNG_HASH}`,
      `/_content/logo.svg?v=${SVG_HASH}`,
    ]);
  });

  test('collects missing files without a version', async () => {
    const { file } = await transform('![alt](./missing.png)', { optimize: true });
    expect(file.data.images).toEqual(['/_content/docs/missing.png']);
  });

  test('keeps sizing params alongside the version when optimizing', async () => {
    const { tree } = await transform('![alt](./img.png?w=640&q=90)', { optimize: true });
    expect(firstImageUrl(tree)).toBe(
      `/api/image?url=%2F_content%2Fdocs%2Fimg.png&w=640&q=90&v=${PNG_HASH}`
    );
  });

  test('never hashes files outside the content root', async () => {
    const contentDir = setupContentDir();
    fs.writeFileSync(path.join(contentDir, '..', 'secret.png'), 'outside-bytes');
    const { tree } = await transform('![alt](../../secret.png)', { optimize: false }, contentDir);
    expect(firstImageUrl(tree)).toBe('/_content/../secret.png');
    expect(firstImageUrl(tree)).not.toContain('?v=');
  });

  test('resolves url-encoded filenames to the file on disk', async () => {
    const contentDir = setupContentDir();
    fs.writeFileSync(path.join(contentDir, 'docs', 'my image.png'), PNG_BYTES);
    const { tree } = await transform('![alt](./my%20image.png)', { optimize: false }, contentDir);
    expect(firstImageUrl(tree)).toBe(`/_content/docs/my%20image.png?v=${PNG_HASH}`);
  });

  test('never hashes encoded-backslash traversal outside the content root', async () => {
    const contentDir = setupContentDir();
    fs.writeFileSync(path.join(contentDir, '..', 'secret.png'), 'outside-bytes');
    const { tree } = await transform(
      '![alt](/_content/docs/%5C..%5C..%5Csecret.png)',
      { optimize: false },
      contentDir
    );
    expect(firstImageUrl(tree)).not.toContain('?v=');
  });

  test('resolves images when the vfile path uses Windows separators', async () => {
    const contentDir = setupContentDir();
    const winPath = path.win32.join(contentDir.replace(/\//g, '\\'), 'docs', 'page.mdx');
    const { tree } = await transform('![alt](./img.png)', { optimize: false }, contentDir, winPath);
    expect(firstImageUrl(tree)).toBe(`/_content/docs/img.png?v=${PNG_HASH}`);
  });
});

describe('versioned pages', () => {
  function setupVersionsDir(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-remark-v-'));
    const versionsDir = path.join(root, 'versions');
    fs.mkdirSync(path.join(versionsDir, 'v1', 'docs'), { recursive: true });
    fs.writeFileSync(path.join(versionsDir, 'v1', 'docs', 'img.png'), PNG_BYTES);
    return versionsDir;
  }

  test('exports images for a page under versions/', async () => {
    // `valueToExport` names `images`, so a page that never sets it fails the
    // production build with a missing-export error. Every versioned page used
    // to take that path, which meant no versioned site could be built.
    const versionsDir = setupVersionsDir();
    const { file } = await transform(
      'no images here',
      undefined,
      versionsDir,
      path.join(versionsDir, 'v1', 'docs', 'page.mdx')
    );
    expect(file.data.images).toEqual([]);
  });

  test('resolves a relative image under versions/ against the mirror path', async () => {
    const versionsDir = setupVersionsDir();
    const { tree } = await transform(
      '![alt](./img.png)',
      { optimize: false },
      versionsDir,
      path.join(versionsDir, 'v1', 'docs', 'page.mdx')
    );
    expect(firstImageUrl(tree)).toBe(`/_content/v1/docs/img.png?v=${PNG_HASH}`);
  });

  test('exports an empty list when the path is outside any content root', async () => {
    const { file } = await transform(
      'stray file',
      undefined,
      '/tmp',
      '/tmp/elsewhere/page.mdx'
    );
    expect(file.data.images).toEqual([]);
  });
});
