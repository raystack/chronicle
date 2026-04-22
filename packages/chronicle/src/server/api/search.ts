import MiniSearch from 'minisearch';
import { defineHandler, HTTPError } from 'nitro';
import type { OpenAPIV3 } from 'openapi-types';
import { getSpecSlug } from '@/lib/api-routes';
import { getApiConfigsForVersion, loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';
import { extractFrontmatter, getPagesForVersion } from '@/lib/source';
import { LATEST_CONTEXT, type VersionContext } from '@/lib/version-source';

interface SearchDocument {
  id: string;
  url: string;
  title: string;
  content: string;
  type: 'page' | 'api';
}

const indexCache = new Map<string, MiniSearch<SearchDocument>>();
const docsCache = new Map<string, SearchDocument[]>();

function keyFor(ctx: VersionContext): string {
  return ctx.dir ?? '__latest__';
}

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

async function scanContent(ctx: VersionContext): Promise<SearchDocument[]> {
  const pages = await getPagesForVersion(ctx);
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

async function buildApiDocs(ctx: VersionContext): Promise<SearchDocument[]> {
  const config = loadConfig();
  const apiConfigs = getApiConfigsForVersion(config, ctx.dir);
  if (!apiConfigs.length) return [];

  const docs: SearchDocument[] = [];
  const specs = await loadApiSpecs(apiConfigs);

  for (const spec of specs) {
    const specSlug = getSpecSlug(spec);
    const paths = spec.document.paths ?? {};
    for (const [, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const op = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!op?.operationId) continue;
        const url = `${ctx.urlPrefix}/apis/${specSlug}/${encodeURIComponent(op.operationId)}`;
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

async function getDocs(ctx: VersionContext): Promise<SearchDocument[]> {
  const key = keyFor(ctx);
  const cached = docsCache.get(key);
  if (cached) return cached;
  const [contentDocs, apiDocs] = await Promise.all([
    scanContent(ctx),
    buildApiDocs(ctx)
  ]);
  const docs = [...contentDocs, ...apiDocs];
  docsCache.set(key, docs);
  return docs;
}

async function getIndex(ctx: VersionContext): Promise<MiniSearch<SearchDocument>> {
  const key = keyFor(ctx);
  const cached = indexCache.get(key);
  if (cached) return cached;
  const docs = await getDocs(ctx);
  const index = createIndex(docs);
  indexCache.set(key, index);
  return index;
}

function resolveCtx(tag: string | null): VersionContext {
  if (!tag) return LATEST_CONTEXT;
  const config = loadConfig();
  const version = config.versions?.find(v => v.dir === tag);
  if (!version) {
    throw new HTTPError({
      status: 400,
      message: `Unknown version tag: ${tag}`,
    });
  }
  return { dir: version.dir, urlPrefix: `/${version.dir}` };
}

export default defineHandler(async event => {
  const query = event.url.searchParams.get('query') ?? '';
  const tag = event.url.searchParams.get('tag');
  const ctx = resolveCtx(tag);
  const index = await getIndex(ctx);

  if (!query) {
    const docs = await getDocs(ctx);
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
