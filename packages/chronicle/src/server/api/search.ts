import MiniSearch from 'minisearch';
import { defineHandler } from 'nitro';
import type { OpenAPIV3 } from 'openapi-types';
import { getSpecSlug } from '@/lib/api-routes';
import { loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';
import { getPages, extractFrontmatter } from '@/lib/source';

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

async function scanContent(): Promise<SearchDocument[]> {
  const pages = await getPages();
  return pages.map(p => {
    const fm = extractFrontmatter(p);
    return {
      id: p.url,
      url: p.url,
      title: fm.title,
      content: fm.description ?? '',
      type: 'page' as const
    };
  });
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

async function getDocs(): Promise<SearchDocument[]> {
  if (cachedDocs) return cachedDocs;
  const [contentDocs, apiDocs] = await Promise.all([
    scanContent(),
    buildApiDocs()
  ]);
  cachedDocs = [...contentDocs, ...apiDocs];
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
