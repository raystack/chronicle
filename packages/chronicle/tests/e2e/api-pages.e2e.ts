import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const SPECS_URL = /\/api\/specs|\/data\/specs\//;

test.describe('API pages', () => {
  test('sidebar navigation between endpoints does not refetch specs or remount layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/apis`);
    await page.waitForSelector('h1');
    const firstTitle = await page.textContent('h1');

    // Mark the sidebar DOM node — if the layout remounts (skeleton flash),
    // the marker disappears with the old node.
    await page.evaluate(() => {
      document.querySelector('aside')?.setAttribute('data-e2e-marker', '1');
    });

    let specRequests = 0;
    page.on('request', req => {
      if (SPECS_URL.test(req.url())) specRequests++;
    });

    const currentPath = new URL(page.url()).pathname;
    const otherEndpoint = page
      .locator(`aside a[href^="/apis/"]:not([href="${currentPath}"])`)
      .first();
    await otherEndpoint.click();

    await expect(page.locator('h1')).not.toHaveText(firstTitle!);
    expect(specRequests, 'specs must not be refetched on same-version nav').toBe(0);
    await expect(
      page.locator('aside[data-e2e-marker]'),
      'sidebar must stay mounted across endpoint navigation',
    ).toHaveCount(1);
  });

  test('unknown operation shows 404 instead of blank content', async ({ page }) => {
    await page.goto(`${BASE_URL}/apis/petstore/does-not-exist`);

    await expect(page.getByText('Page not found')).toBeVisible();
  });

  test('client nav from docs to APIs loads specs and renders an endpoint', async ({ page }) => {
    await page.goto(`${BASE_URL}/docs`);
    await page.waitForSelector('#root');

    let specRequests = 0;
    page.on('request', req => {
      if (SPECS_URL.test(req.url())) specRequests++;
    });

    await page.locator('a[href="/apis"]').filter({ visible: true }).first().click();

    await page.waitForURL('**/apis/**');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Page not found')).toHaveCount(0);
    expect(specRequests, 'specs must be fetched once on first API visit').toBe(1);
  });

  test('spec fetch failure on client nav shows error state, not blank page', async ({ page }) => {
    await page.route(SPECS_URL, route => route.fulfill({ status: 500, body: '' }));

    await page.goto(`${BASE_URL}/docs`);
    await page.waitForSelector('#root');

    await page.locator('a[href="/apis"]').filter({ visible: true }).first().click();

    await expect(page.getByText('Failed to render page')).toBeVisible();
  });
});
