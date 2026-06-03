import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const STATIC_URL = process.env.STATIC_URL || 'http://localhost:4173';
const PAGES_DIR = process.env.PAGES_DIR || path.resolve(
  import.meta.dirname,
  '../../../../examples/basic/.output/public/data/pages',
);

function getPageUrls(): string[] {
  if (!fs.existsSync(PAGES_DIR)) return [];
  return fs.readdirSync(PAGES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const slug = f.replace('.json', '');
      if (slug === 'index') return '/';
      return '/' + slug.split(',').join('/');
    });
}

test('check all pages for broken images and assets', async ({ page }) => {
  const pageUrls = getPageUrls();
  test.skip(pageUrls.length === 0, 'No pages found — build the static site first');

  const broken: { url: string; images: string[] }[] = [];
  const failedRequests: { pageUrl: string; resource: string }[] = [];

  page.on('requestfailed', req => {
    const resourceUrl = req.url();
    if (resourceUrl.includes('/favicon')) return;
    if (resourceUrl.includes('google-analytics')) return;
    failedRequests.push({ pageUrl: page.url(), resource: resourceUrl });
  });

  for (const pageUrl of pageUrls) {
    await page.goto(`${STATIC_URL}${pageUrl}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter(img => img.complete && img.naturalWidth === 0 && img.src && !img.src.includes('data:'))
        .map(img => img.src);
    });

    if (brokenImages.length > 0) {
      broken.push({ url: pageUrl, images: brokenImages });
    }
  }

  const outDir = path.resolve(import.meta.dirname, '../../test-results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'broken-assets-report.json'),
    JSON.stringify({ totalPages: pageUrls.length, broken, failedRequests }, null, 2),
  );

  expect(broken, `Broken images found on ${broken.length} pages`).toHaveLength(0);
});
