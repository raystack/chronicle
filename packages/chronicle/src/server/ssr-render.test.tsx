import { describe, expect, test } from 'bun:test';
import React, { lazy, Suspense } from 'react';
import { prerender } from 'react-dom/static.edge';

// Contract tests for the SSR rendering strategy used in entry-server.tsx.
//
// Pages must be fully readable with JavaScript disabled. React's streaming
// renderer emits Suspense content as `<div hidden id="S:*">` segments revealed
// by inline `$RC` scripts, and — crucially — `prerender` still "outlines"
// completed boundaries larger than progressiveChunkSize (12,800 bytes by
// default) into that same mechanism. entry-server.tsx therefore renders with
// prerender + progressiveChunkSize: Number.MAX_SAFE_INTEGER. These tests pin
// that contract against react-dom upgrades.

const NO_JS_RENDER_OPTIONS = { progressiveChunkSize: Number.MAX_SAFE_INTEGER };

// Well over the 12,800-byte default, like any real docs page.
const BIG_TEXT = 'chronicle-no-js-content '.repeat(1000);

function lazyAfterTick<T extends React.ComponentType>(Component: T) {
  return lazy(
    () => new Promise<{ default: T }>(resolve => setTimeout(() => resolve({ default: Component }), 10))
  );
}

async function renderToHtml(node: React.ReactNode, options?: { progressiveChunkSize?: number }) {
  const { prelude } = await prerender(
    <html lang="en">
      <head />
      <body>{node}</body>
    </html>,
    options
  );
  return new Response(prelude).text();
}

function LargePage() {
  return (
    <main>
      <h1>Getting Started</h1>
      <p>{BIG_TEXT}</p>
    </main>
  );
}

function expectFullyInlined(html: string) {
  expect(html).not.toContain('<!--$?-->'); // pending boundary marker
  expect(html).not.toContain('hidden id="S:'); // outlined content segment
  expect(html).not.toContain('$RC('); // client-side reveal script
  expect(html).not.toContain('<template id="B:'); // fallback placeholder
}

describe('SSR no-JS contract (prerender + unbounded progressiveChunkSize)', () => {
  test('inlines large lazy Suspense content in place', async () => {
    const Page = lazyAfterTick(LargePage);
    const html = await renderToHtml(
      <Suspense fallback={<span>skeleton</span>}>
        <Page />
      </Suspense>,
      NO_JS_RENDER_OPTIONS
    );

    expectFullyInlined(html);
    expect(html).toContain(BIG_TEXT.slice(0, 100));
    expect(html).not.toContain('skeleton');
  });

  test('inlines nested Suspense boundaries (layout > page > toc shape)', async () => {
    const Toc = lazyAfterTick(() => <nav>toc-entries</nav>);
    const Page = lazyAfterTick(() => (
      <article>
        <p>{BIG_TEXT}</p>
        <Suspense fallback={null}>
          <Toc />
        </Suspense>
      </article>
    ));
    const html = await renderToHtml(
      <Suspense fallback={<span>skeleton</span>}>
        <Page />
      </Suspense>,
      NO_JS_RENDER_OPTIONS
    );

    expectFullyInlined(html);
    expect(html).toContain('toc-entries');
    expect(html).toContain(BIG_TEXT.slice(0, 100));
  });

  test('waits for slow lazy chunks instead of emitting fallbacks', async () => {
    const Slow = lazy(
      () =>
        new Promise<{ default: React.ComponentType }>(resolve =>
          setTimeout(() => resolve({ default: () => <p>slow-chunk-content</p> }), 100)
        )
    );
    const html = await renderToHtml(
      <Suspense fallback={<span>skeleton</span>}>
        <Slow />
      </Suspense>,
      NO_JS_RENDER_OPTIONS
    );

    expectFullyInlined(html);
    expect(html).toContain('slow-chunk-content');
    expect(html).not.toContain('skeleton');
  });

  // Documents WHY entry-server.tsx must pass progressiveChunkSize: with the
  // react-dom default, a completed boundary this large is still outlined into
  // hidden divs that only inline scripts can reveal. If this test ever fails,
  // React changed the outlining behavior and the override can be revisited.
  test('default progressiveChunkSize would break no-JS rendering', async () => {
    const Page = lazyAfterTick(LargePage);
    const html = await renderToHtml(
      <Suspense fallback={<span>skeleton</span>}>
        <Page />
      </Suspense>
    );

    expect(html).toContain('<!--$?-->');
    expect(html).toContain('hidden id="S:');
    expect(html).toContain('$RC(');
    expect(html).toContain('skeleton');
  });
});
