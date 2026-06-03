import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const STATIC_URL = 'http://localhost:4174';
const pagesDir = '/Users/rohil/Projects/github.com/pixxelhq/documentation/.output/public/data/pages';

const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
const pageUrls = pageFiles.map(f => {
  const slug = f.replace('.json', '');
  if (slug === 'index') return '/';
  return '/' + slug.split(',').join('/');
});

test('check all pages for broken images and assets', async ({ page }) => {
  const broken: { url: string; images: string[] }[] = [];
  const failedRequests: { url: string; resource: string; status: number }[] = [];

  page.on('requestfailed', req => {
    const resourceUrl = req.url();
    if (resourceUrl.includes('/favicon')) return;
    failedRequests.push({
      url: page.url(),
      resource: resourceUrl,
      status: 0,
    });
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

  const report = {
    totalPages: pageUrls.length,
    pagesWithBrokenImages: broken.length,
    totalBrokenImages: broken.reduce((sum, b) => sum + b.images.length, 0),
    failedRequests: failedRequests.length,
    broken,
    failedRequestDetails: failedRequests.slice(0, 50),
  };

  fs.writeFileSync(
    path.join(outDir, 'broken-assets-report.json'),
    JSON.stringify(report, null, 2),
  );

  console.log(`Checked ${pageUrls.length} pages`);
  console.log(`Pages with broken images: ${broken.length}`);
  console.log(`Total broken images: ${report.totalBrokenImages}`);
  console.log(`Failed network requests: ${failedRequests.length}`);

  if (broken.length > 0) {
    console.log('\nBroken images:');
    for (const b of broken) {
      console.log(`  ${b.url}:`);
      for (const img of b.images) {
        console.log(`    - ${img}`);
      }
    }
  }

  if (failedRequests.length > 0) {
    console.log('\nFailed requests:');
    for (const f of failedRequests.slice(0, 20)) {
      console.log(`  ${f.url} -> ${f.resource}`);
    }
  }
});
