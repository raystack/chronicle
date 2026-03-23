import fs from 'node:fs/promises';
import matter from 'gray-matter';
import MiniSearch from 'minisearch';
import { defineHandler } from 'nitro';
import type { OpenAPIV3 } from 'openapi-types';
import path from 'node:path';
import { getSpecSlug } from '@/lib/api-routes';
import { loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';

interface SearchDocument {
  id: string;
  url: string;
  title: string;
  content: string;
  type: 'page' | 'api';
}

let searchIndex: MiniSearch<SearchDocument> | null = null;
let cachedDocs: SearchDocument[] | null = null;

function createIndex(docs: SearchDocument[]): MiniSearch<SearchDocument> {
  const index = new MiniSearch<SearchDocument>({
    fields: ['title', 'content'],
    storeFields: ['url', 'title', 'type'],
    searchOptions: {
      boost: { title: 2 },
      fuzzy: 0.2,
      prefix: true
    }
  });
  index.addAll(docs);
  return index;
}

async function loadPrebuiltIndex(): Promise<SearchDocument[] | null> {
  try {
    const indexPath = path.resolve(__dirname, 'search-index.json');
    const raw = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getContentDir(): string {
  return __CHRONICLE_CONTENT_DIR__ || path.join(process.cwd(), 'content');
}

async function scanContent(): Promise<SearchDocument[]> {
  const contentDir = getContentDir();
  const docs: SearchDocument[] = [];

  async function scan(dir: string, prefix: string[] = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules')
          continue;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath, [...prefix, entry.name]);
          continue;
        }

        if (!entry.name.endsWith('.mdx') && !entry.name.endsWith('.md'))
          continue;

        const raw = await fs.readFile(fullPath, 'utf-8');
        const { data: fm, content } = matter(raw);
        const baseName = entry.name.replace(/\.(mdx|md)$/, '');
        const slugs = baseName === 'index' ? prefix : [...prefix, baseName];
        const url = slugs.length === 0 ? '/' : `/${slugs.join('/')}`;

        docs.push({
          id: url,
          url,
          title: fm.title ?? baseName,
          content: content.slice(0, 5000),
          type: 'page'
        });
      }
    } catch {
      /* directory not readable */
    }
  }

  await scan(contentDir);
  return docs;
}

async function buildApiDocs(): Promise<SearchDocument[]> {
  const config = loadConfig();
  if (!config.api?.length) return [];

  const docs: SearchDocument[] = [];
  const specs = await loadApiSpecs(config.api);

  for (const spec of specs) {
    const specSlug = getSpecSlug(spec);
    const paths = spec.document.paths ?? {};
    for (const [, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const op = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!op?.operationId) continue;
        const url = `/apis/${specSlug}/${encodeURIComponent(op.operationId)}`;
        docs.push({
          id: url,
          url,
          title: `${method.toUpperCase()} ${op.summary ?? op.operationId}`,
          content: op.description ?? '',
          type: 'api'
        });
      }
    }
  }

  return docs;
}

async function loadDocuments(): Promise<SearchDocument[]> {
  const prebuilt = await loadPrebuiltIndex();
  if (prebuilt) return prebuilt;

  const [contentDocs, apiDocs] = await Promise.all([
    scanContent(),
    buildApiDocs()
  ]);
  return [...contentDocs, ...apiDocs];
}

async function getDocs(): Promise<SearchDocument[]> {
  if (cachedDocs) return cachedDocs;
  cachedDocs = await loadDocuments();
  return cachedDocs;
}

async function getIndex(): Promise<MiniSearch<SearchDocument>> {
  if (searchIndex) return searchIndex;
  const docs = await getDocs();
  searchIndex = createIndex(docs);
  return searchIndex;
}

export default defineHandler(async event => {
  const query = event.url.searchParams.get('query') ?? '';
  const index = await getIndex();

  if (!query) {
    const docs = await getDocs();
    return docs
      .filter(d => d.type === 'page')
      .slice(0, 8)
      .map(d => ({
        id: d.id,
        url: d.url,
        type: d.type,
        content: d.title
      }));
  }

  return index.search(query).map(r => ({
    id: r.id,
    url: r.url,
    type: r.type,
    content: r.title
  }));
});
