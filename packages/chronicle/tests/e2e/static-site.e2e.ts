import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

test.describe('Static site mode', () => {
  test('index.html loads and renders the app shell', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('#root');
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
  });

  test('landing page shows content directory cards', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-theme]', { timeout: 10000 });
    const body = await page.textContent('body');
    expect(body).toContain('My Documentation');
  });

  test('navigates to a docs page and shows content', async ({ page }) => {
    await page.goto(`${BASE_URL}/docs/getting-started`);
    await page.waitForSelector('[data-theme]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toContain('Getting Started');
  });

  test('sidebar navigation works (client-side nav)', async ({ page }) => {
    await page.goto(`${BASE_URL}/docs/getting-started`);
    await page.waitForSelector('[data-theme]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const installationLink = page.locator('a[href="/docs/guides/installation"]').first();
    await expect(installationLink).toBeVisible();
    await installationLink.click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/docs/guides/installation');
    const body = await page.textContent('body');
    expect(body).toContain('Installation');
  });

  test('search dialog opens with Ctrl/Cmd+K', async ({ page }) => {
    await page.goto(`${BASE_URL}/docs/getting-started`);
    await page.waitForSelector('[data-theme]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder="Search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('install');
    await page.waitForTimeout(1000);
    const results = await page.textContent('body');
    expect(results).toContain('Install');
  });

  test('page data JSON files are accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/data/pages/docs,getting-started.json`);
    expect(response?.status()).toBe(200);
    const data = await response?.json();
    expect(data.frontmatter.title).toBe('Getting Started');
    expect(data.prev).toBeDefined();
    expect(data.next).toBeDefined();
  });

  test('search index JSON is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/data/search.json`);
    expect(response?.status()).toBe(200);
    const data = await response?.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('title');
    expect(data[0]).toHaveProperty('url');
    expect(data[0]).toHaveProperty('type');
  });

  test('sitemap.xml is generated', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/sitemap.xml`);
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain('<urlset');
    expect(text).toContain('docs.example.com');
  });

  test('robots.txt is generated', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/robots.txt`);
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Allow: /');
  });

  test('llms.txt is generated', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/llms.txt`);
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain('My Documentation');
  });

  test('public assets are copied (logo)', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/logo.svg`);
    expect(response?.status()).toBe(200);
  });

  test('__STATIC_MODE__ is set in window', async ({ page }) => {
    await page.goto(BASE_URL);
    const staticMode = await page.evaluate(() => (window as any).__STATIC_MODE__);
    expect(staticMode).toBe(true);
  });

  test('__PAGE_DATA__ contains config and tree', async ({ page }) => {
    await page.goto(BASE_URL);
    const pageData = await page.evaluate(() => (window as any).__PAGE_DATA__);
    expect(pageData.config.site.title).toBe('My Documentation');
    expect(pageData.tree).toBeDefined();
    expect(pageData.tree.children.length).toBeGreaterThan(0);
  });

  test('404 handling for unknown routes', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page`);
    await page.waitForSelector('[data-theme]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toContain('not found');
  });
});
