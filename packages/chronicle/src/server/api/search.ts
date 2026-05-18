import { defineHandler, HTTPError } from 'nitro';
import { useDatabase } from 'nitro/database';
import type { OpenAPIV3 } from 'openapi-types';
import { getSpecSlug } from '@/lib/api-routes';
import { getApiConfigsForVersion, loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';
import { extractFrontmatter, getPageSearchContent, getPagesForVersion } from '@/lib/source';
import { LATEST_CONTEXT, type VersionContext } from '@/lib/version-source';

interface SearchDocument {
  id: string;
  url: string;
  title: string;
  headings: string;
  body: string;
  type: 'page' | 'api';
  section: string;
}

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LOCK_FILE = path.join(os.tmpdir(), 'chronicle-search-ready');

export const indexedVersions = new Set<string>();
let indexPromise: Promise<void> | null = null;

function versionKey(ctx: VersionContext): string {
  return ctx.dir ?? '__latest__';
}

// biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op catch
fs.unlink(LOCK_FILE).catch(() => {});

export function isSearchReady(): boolean {
  return existsSync(LOCK_FILE);
}

export async function ensureIndex(ctx: VersionContext) {
  const key = versionKey(ctx);
  if (indexedVersions.has(key)) return;
  if (indexPromise) return indexPromise;
  indexPromise = buildIndex(ctx, key);
  await indexPromise;
  indexPromise = null;
  await fs.writeFile(LOCK_FILE, new Date().toISOString());
}

async function buildIndex(ctx: VersionContext, key: string) {
  // biome-ignore lint/correctness/useHookAtTopLevel: useDatabase is a Nitro DI accessor, not a React hook
  const db = useDatabase();

  await db.exec('DROP TABLE IF EXISTS search_fts');
  await db.exec('DROP TABLE IF EXISTS search_docs');

  await db.exec(`CREATE TABLE IF NOT EXISTS search_docs (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    headings TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    version TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT ''
  )`);

  await db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
    title,
    headings,
    body,
    content=search_docs,
    content_rowid=rowid
  )`);

  const docs = await buildDocs(ctx);
  for (const doc of docs) {
    await db.sql`INSERT INTO search_docs (id, url, title, headings, body, type, version, section)
      VALUES (${doc.id}, ${doc.url}, ${doc.title}, ${doc.headings}, ${doc.body}, ${doc.type}, ${key}, ${doc.section})`;
  }

  await db.sql`INSERT INTO search_fts (rowid, title, headings, body)
    SELECT rowid, title, headings, body FROM search_docs WHERE version = ${key}`;

  indexedVersions.add(key);
}

async function buildDocs(ctx: VersionContext): Promise<SearchDocument[]> {
  const docs: SearchDocument[] = [];
  const config = loadConfig();
  const sectionMap = buildSectionMap(config);

  const pages = await getPagesForVersion(ctx);
  for (const p of pages) {
    const fm = extractFrontmatter(p);
    const { headings, body } = await getPageSearchContent(p);
    docs.push({
      id: p.url,
      url: p.url,
      title: fm.title,
      headings,
      body: [fm.description ?? '', body].join(' '),
      type: 'page',
      section: getSectionLabel(p.url, sectionMap) ?? '',
    });
  }

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
            headings: op.summary ?? opId,
            body: [op.description ?? '', pathStr, method.toUpperCase()].join(' '),
            type: 'api',
            section: spec.name,
          });
        }
      }
    }
  }

  return docs;
}

function findMatch(
  query: string,
  title: string,
  headings: string,
  body: string,
): { match: 'title' | 'heading' | 'body'; snippet: string } {
  if (title.toLowerCase().includes(query)) {
    return { match: 'title', snippet: title };
  }

  const headingList = headings.split('\n').filter(Boolean);
  for (const h of headingList) {
    if (h.toLowerCase().includes(query)) {
      return { match: 'heading', snippet: h };
    }
  }

  const idx = body.toLowerCase().indexOf(query);
  if (idx >= 0) {
    const start = Math.max(0, idx - 40);
    const end = Math.min(body.length, idx + query.length + 80);
    const snippet = (start > 0 ? '...' : '') + body.slice(start, end).trim() + (end < body.length ? '...' : '');
    return { match: 'body', snippet };
  }

  return { match: 'title', snippet: title };
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
  // biome-ignore lint/correctness/useHookAtTopLevel: useDatabase is a Nitro DI accessor, not a React hook
  const db = useDatabase();
  const key = versionKey(ctx);

  if (!query) {
    const result = await db.sql`SELECT id, url, title, type, section FROM search_docs
      WHERE version = ${key} AND type = 'page'
      LIMIT 8`;
    return Response.json((result.rows ?? []).map(r => ({
      id: r.id,
      url: r.url,
      type: r.type,
      content: r.title,
      section: r.section || null,
    })));
  }

  const searchTerm = query.split(/\s+/).map(t => `"${t}"*`).join(' ');
  const result = await db.sql`SELECT s.id, s.url, s.title, s.headings, s.body, s.type, s.section,
      bm25(search_fts, 10.0, 5.0, 1.0) AS score
    FROM search_fts f
    JOIN search_docs s ON s.rowid = f.rowid
    WHERE search_fts MATCH ${searchTerm}
      AND s.version = ${key}
    ORDER BY score
    LIMIT 20`;

  const queryLower = query.toLowerCase();
  return Response.json((result.rows ?? []).map(r => {
    const { match, snippet } = findMatch(queryLower, r.title as string, r.headings as string, r.body as string);
    return {
      id: r.id,
      url: r.url,
      type: r.type,
      content: r.title,
      match,
      snippet,
      section: r.section || null,
    };
  }));
});

function buildSectionMap(config: ReturnType<typeof loadConfig>): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of config.content ?? []) {
    map.set(entry.dir, entry.label ?? entry.dir);
  }
  for (const api of config.api ?? []) {
    const basePath = (api.basePath ?? '/apis').replace(/^\//, '');
    map.set(basePath, api.name);
  }
  return map;
}

function getSectionLabel(url: string, sectionMap: Map<string, string>): string | null {
  const segments = url.replace(/^\//, '').split('/');
  const first = segments[0];
  if (!first) return null;
  return sectionMap.get(first) ?? null;
}
