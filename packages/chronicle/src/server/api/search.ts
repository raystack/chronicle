import { defineHandler, HTTPError } from 'nitro';
import { useDatabase } from 'nitro/database';
import type { OpenAPIV3 } from 'openapi-types';
import { getSpecSlug, getFirstApiUrl } from '@/lib/api-routes';
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

const indexedVersions = new Set<string>();

function versionKey(ctx: VersionContext): string {
  return ctx.dir ?? '__latest__';
}

async function ensureIndex(ctx: VersionContext) {
  const key = versionKey(ctx);
  if (indexedVersions.has(key)) return;

  const db = useDatabase();

  await db.sql`DROP TABLE IF EXISTS search_docs`;
  await db.sql`DROP TABLE IF EXISTS search_fts`;

  await db.sql`CREATE TABLE IF NOT EXISTS search_docs (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    version TEXT NOT NULL
  )`;

  await db.sql`CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
    title,
    content,
    content=search_docs,
    content_rowid=rowid
  )`;

  const docs = await buildDocs(ctx);
  for (const doc of docs) {
    await db.sql`INSERT INTO search_docs (id, url, title, content, type, version)
      VALUES (${doc.id}, ${doc.url}, ${doc.title}, ${doc.content}, ${doc.type}, ${key})`;
  }

  await db.sql`INSERT INTO search_fts (rowid, title, content)
    SELECT rowid, title, content FROM search_docs WHERE version = ${key}`;

  indexedVersions.add(key);
}

async function buildDocs(ctx: VersionContext): Promise<SearchDocument[]> {
  const docs: SearchDocument[] = [];

  const pages = await getPagesForVersion(ctx);
  for (const p of pages) {
    const fm = extractFrontmatter(p);
    docs.push({
      id: p.url,
      url: p.url,
      title: fm.title,
      content: [fm.title, fm.description ?? ''].join(' '),
      type: 'page',
    });
  }

  const config = loadConfig();
  const apiConfigs = getApiConfigsForVersion(config, ctx.dir);
  if (apiConfigs.length) {
    const specs = await loadApiSpecs(apiConfigs);
    for (const spec of specs) {
      const specSlug = getSpecSlug(spec);
      const paths = spec.document.paths ?? {};
      for (const [pathStr, pathItem] of Object.entries(paths)) {
        if (!pathItem) continue;
        for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
          const op = pathItem[method] as OpenAPIV3.OperationObject | undefined;
          if (!op) continue;
          const opId = op.operationId ?? `${method}_${pathStr.replace(/[/{}\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
          const url = `${ctx.urlPrefix}/apis/${specSlug}/${encodeURIComponent(opId)}`;
          docs.push({
            id: url,
            url,
            title: `${method.toUpperCase()} ${op.summary ?? opId}`,
            content: [op.summary ?? '', op.description ?? '', pathStr, method.toUpperCase()].join(' '),
            type: 'api',
          });
        }
      }
    }
  }

  return docs;
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

  await ensureIndex(ctx);
  const db = useDatabase();
  const key = versionKey(ctx);

  if (!query) {
    const result = await db.sql`SELECT id, url, title, type FROM search_docs
      WHERE version = ${key} AND type = 'page'
      LIMIT 8`;
    return Response.json((result.rows ?? []).map(r => ({
      id: r.id,
      url: r.url,
      type: r.type,
      content: r.title,
    })));
  }

  const searchTerm = query.split(/\s+/).map(t => `"${t}"*`).join(' ');
  const result = await db.sql`SELECT s.id, s.url, s.title, s.type,
      rank
    FROM search_fts f
    JOIN search_docs s ON s.rowid = f.rowid
    WHERE search_fts MATCH ${searchTerm}
      AND s.version = ${key}
    ORDER BY rank
    LIMIT 20`;

  return Response.json((result.rows ?? []).map(r => ({
    id: r.id,
    url: r.url,
    type: r.type,
    content: r.title,
  })));
});
