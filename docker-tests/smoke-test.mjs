import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
let failed = 0;

console.log(`Smoke tests against ${BASE}\n`);

// index returns 200 or 307
{
  const res = await fetch(`${BASE}/`);
  assert.ok(res.status === 200 || res.status === 307, `index: expected 200 or 307, got ${res.status}`);
  console.log('  ✓ index returns 200 or 307');
}

// page API returns frontmatter
{
  const res = await fetch(`${BASE}/api/page?slug=docs,getting-started`);
  assert.equal(res.status, 200, `page API: expected 200, got ${res.status}`);
  const data = await res.json();
  assert.ok(data.frontmatter, 'page API: missing frontmatter');
  assert.ok(data.frontmatter.title, 'page API: missing title');
  console.log('  ✓ page API returns frontmatter');
}

// search API returns results
{
  const res = await fetch(`${BASE}/api/search`);
  assert.equal(res.status, 200, `search API: expected 200, got ${res.status}`);
  const data = await res.json();
  assert.ok(Array.isArray(data), 'search API: expected array');
  assert.ok(data.length > 0, 'search API: expected results');
  assert.ok(data[0].url, 'search API: missing url');
  console.log('  ✓ search API returns results');
}

// search with query returns matches
{
  const res = await fetch(`${BASE}/api/search?query=getting`);
  assert.equal(res.status, 200, `search query: expected 200, got ${res.status}`);
  const data = await res.json();
  assert.ok(data.length > 0, 'search query: expected results');
  assert.ok(data[0].match, 'search query: missing match field');
  console.log('  ✓ search with query returns matches');
}

// image API resizes PNG
{
  const res = await fetch(`${BASE}/api/image?url=${encodeURIComponent('/_content/docs/test-image.png')}&w=320`);
  assert.equal(res.status, 200, `image API: expected 200, got ${res.status}`);
  const ct = res.headers.get('content-type');
  assert.ok(ct.startsWith('image/'), `image API: expected image content-type, got ${ct}`);
  console.log('  ✓ image API resizes PNG');
}

// image API returns 400 for missing params
{
  const res = await fetch(`${BASE}/api/image`);
  assert.equal(res.status, 400, `image 400: expected 400, got ${res.status}`);
  console.log('  ✓ image API returns 400 for missing params');
}

// image API returns 400 for invalid width
{
  const res = await fetch(`${BASE}/api/image?url=${encodeURIComponent('/_content/docs/test-image.png')}&w=999`);
  assert.equal(res.status, 400, `image invalid width: expected 400, got ${res.status}`);
  console.log('  ✓ image API returns 400 for invalid width');
}

// image API returns 404 for missing image
{
  const res = await fetch(`${BASE}/api/image?url=${encodeURIComponent('/_content/does-not-exist.png')}&w=640`);
  assert.equal(res.status, 404, `image 404: expected 404, got ${res.status}`);
  console.log('  ✓ image API returns 404 for missing image');
}

console.log('\nALL PASSED');
