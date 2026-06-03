import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const STATIC_URL = 'http://localhost:4174';
const SSR_URL = 'http://localhost:3005';

const PAGES_TO_COMPARE = [
  { name: 'docs-overview', path: '/documentation/satellite_and_imagery/pixxel_overview' },
  { name: 'docs-getting-started', path: '/documentation/getting_started/pricingandrefunds/pricingoverview' },
  { name: 'developer-intro', path: '/developer/gettingstarted/introduction' },
  { name: 'developer-auth', path: '/developer/gettingstarted/authentication' },
  { name: 'api-ping', path: '/apis/pixxel/get_ping' },
  { name: 'api-list-projects', path: '/apis/pixxel/list_projects' },
  { name: 'api-search-images', path: '/apis/pixxel/search_satellite_images' },
];

const outDir = path.resolve(import.meta.dirname, '../../test-results/compare');

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

for (const pg of PAGES_TO_COMPARE) {
  test(`compare: ${pg.name}`, async ({ browser }) => {
    const ctxSSR = await browser.newContext();
    const ctxStatic = await browser.newContext();
    const pageSSR = await ctxSSR.newPage();
    const pageStatic = await ctxStatic.newPage();

    await Promise.all([
      pageSSR.goto(`${SSR_URL}${pg.path}`, { waitUntil: 'networkidle' }),
      pageStatic.goto(`${STATIC_URL}${pg.path}`, { waitUntil: 'networkidle' }),
    ]);

    await Promise.all([
      pageSSR.waitForTimeout(3000),
      pageStatic.waitForTimeout(3000),
    ]);

    const ssrSnap = await pageSSR.evaluate(() => {
      function extractContent(el: Element): any {
        const result: any = { tag: el.tagName.toLowerCase() };
        const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
          ? el.childNodes[0].textContent?.trim() : null;
        if (text) result.text = text;

        const classes = el.className;
        if (classes && typeof classes === 'string') {
          const meaningful = classes.split(' ').filter(c =>
            !c.match(/^_[a-zA-Z]+_[a-z0-9]+_/) && !c.match(/^[a-zA-Z]+-[a-zA-Z0-9]{6,}/)
          );
          if (meaningful.length) result.class = meaningful.join(' ');
        }

        if (el.tagName === 'A') result.href = (el as HTMLAnchorElement).getAttribute('href');
        if (el.tagName === 'IMG') result.src = (el as HTMLImageElement).getAttribute('src');

        const children: any[] = [];
        for (const child of el.children) {
          children.push(extractContent(child));
        }
        if (children.length) result.children = children;
        return result;
      }

      const main = document.querySelector('article') || document.querySelector('[data-article-content]') || document.querySelector('main') || document.querySelector('#root');
      return main ? extractContent(main) : null;
    });

    const staticSnap = await pageStatic.evaluate(() => {
      function extractContent(el: Element): any {
        const result: any = { tag: el.tagName.toLowerCase() };
        const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
          ? el.childNodes[0].textContent?.trim() : null;
        if (text) result.text = text;

        const classes = el.className;
        if (classes && typeof classes === 'string') {
          const meaningful = classes.split(' ').filter(c =>
            !c.match(/^_[a-zA-Z]+_[a-z0-9]+_/) && !c.match(/^[a-zA-Z]+-[a-zA-Z0-9]{6,}/)
          );
          if (meaningful.length) result.class = meaningful.join(' ');
        }

        if (el.tagName === 'A') result.href = (el as HTMLAnchorElement).getAttribute('href');
        if (el.tagName === 'IMG') result.src = (el as HTMLImageElement).getAttribute('src');

        const children: any[] = [];
        for (const child of el.children) {
          children.push(extractContent(child));
        }
        if (children.length) result.children = children;
        return result;
      }

      const main = document.querySelector('article') || document.querySelector('[data-article-content]') || document.querySelector('main') || document.querySelector('#root');
      return main ? extractContent(main) : null;
    });

    fs.writeFileSync(
      path.join(outDir, `${pg.name}-ssr.json`),
      JSON.stringify(ssrSnap, null, 2)
    );
    fs.writeFileSync(
      path.join(outDir, `${pg.name}-static.json`),
      JSON.stringify(staticSnap, null, 2)
    );

    // Take screenshots too
    await pageSSR.screenshot({ path: path.join(outDir, `${pg.name}-ssr.png`), fullPage: true });
    await pageStatic.screenshot({ path: path.join(outDir, `${pg.name}-static.png`), fullPage: true });

    await ctxSSR.close();
    await ctxStatic.close();

    // Both should have content
    expect(ssrSnap).not.toBeNull();
    expect(staticSnap).not.toBeNull();
  });
}
