import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeAuthorList } from './authors';
import { loader } from 'fumadocs-core/source';
import { flattenTree } from 'fumadocs-core/page-tree';
import type { Root, Node, Folder, Item } from 'fumadocs-core/page-tree';

import { parentPath, getFolderPath } from './folder-utils';

const NodeType = {
  Page: 'page',
  Folder: 'folder',
} as const;
import type { MDXContent } from 'mdx/types';
import type { TableOfContents } from 'fumadocs-core/toc';
import {
  getLatestContentRoots,
  getVersionContentRoots,
  loadConfig,
} from './config';
import {
  filterPagesByVersion,
  filterPageTreeByVersion,
  resolveVersionFromUrl,
  type VersionContext,
} from './version-source';
import type { Frontmatter, PageNav, PageNavLink } from '@/types';

const CONTENT_PREFIX = '../../.content/';

const frontmatterGlob: Record<string, Record<string, unknown>> = import.meta.glob(
  '../../.content/**/*.{mdx,md}',
  { eager: true, import: 'frontmatter' }
);

const readingTimeGlob: Record<string, { text: string; minutes: number; words: number; time: number } | undefined> = import.meta.glob(
  '../../.content/**/*.{mdx,md}',
  { eager: true, import: 'readingTime' }
);

const imagesGlob: Record<string, string[] | undefined> = import.meta.glob(
  '../../.content/**/*.{mdx,md}',
  { eager: true, import: 'images' }
);

const metaGlob: Record<string, Record<string, unknown>> = import.meta.glob(
  '../../.content/**/meta.json',
  { eager: true }
);

function buildFiles() {
  const files: {
    type: 'page' | 'meta';
    path: string;
    data: Record<string, unknown>;
  }[] = [];

  for (const [key, data] of Object.entries(frontmatterGlob)) {
    const originalPath = key.slice(CONTENT_PREFIX.length);
    const relativePath = originalPath.replace(/readme\.(mdx?)$/i, 'index.$1');
    const rt = readingTimeGlob[key];
    const _readingTime = rt?.minutes != null ? Math.max(1, Math.round(rt.minutes)) : undefined;
    const _images = imagesGlob[key] ?? [];
    files.push({
      type: 'page',
      path: relativePath,
      data: { ...data, _readingTime, _images, _relativePath: relativePath, _originalPath: originalPath }
    });
  }

  const userMetaPaths = new Set<string>();
  for (const [key, data] of Object.entries(metaGlob)) {
    const relativePath = key.slice(CONTENT_PREFIX.length);
    userMetaPaths.add(relativePath);
    files.push({ type: 'meta', path: relativePath, data: data ?? {} });
  }

  for (const entry of buildSyntheticMeta()) {
    if (userMetaPaths.has(entry.path)) continue;
    files.push(entry);
  }

  return files;
}

function buildSyntheticMeta(): {
  type: 'meta';
  path: string;
  data: Record<string, unknown>;
}[] {
  const config = loadConfig();
  const entries: { type: 'meta'; path: string; data: Record<string, unknown> }[] = [];

  for (const root of getLatestContentRoots(config)) {
    entries.push({
      type: 'meta',
      path: `${root.contentDir}/meta.json`,
      data: { title: root.contentLabel, root: true },
    });
  }

  for (const version of config.versions ?? []) {
    for (const root of getVersionContentRoots(config, version.dir)) {
      entries.push({
        type: 'meta',
        path: `${version.dir}/${root.contentDir}/meta.json`,
        data: { title: root.contentLabel, root: true },
      });
    }
  }

  return entries;
}

// Built through a named factory so the cache keeps the loader's concrete
// type. `ReturnType<typeof loader>` would widen it to the default type
// arguments, which then fails to match what `loader()` actually returned.
function createSource() {
  return loader({
    source: { files: buildFiles() },
    baseUrl: '/'
  });
}

let cachedSource: ReturnType<typeof createSource> | null = null;
let cachedTree: Root | null = null;
let cachedNavMap: Map<string, PageNav> | null = null;

async function getSource(): Promise<ReturnType<typeof createSource>> {
  cachedSource ??= createSource();
  return cachedSource;
}

export { getSource as source };

export function invalidate() {
  cachedSource = null;
  cachedTree = null;
  cachedNavMap = null;
}


function getOrder(node: Node, pageOrderMap: Map<string, number>, folderOrderMap: Map<string, number>): number | undefined {
  if (node.type === NodeType.Page) return pageOrderMap.get(node.url);
  if (node.type === NodeType.Folder) {
    const folderPath = getFolderPath(node);
    if (folderPath) return folderOrderMap.get(folderPath);
  }
  return undefined;
}

function sortNodes(nodes: Node[], pageOrderMap: Map<string, number>, folderOrderMap: Map<string, number>): Node[] {
  return [...nodes]
    .map(n =>
      n.type === 'folder'
        ? ({ ...n, children: sortNodes(n.children, pageOrderMap, folderOrderMap) } as Folder)
        : n
    )
    .sort(
      (a, b) =>
        (getOrder(a, pageOrderMap, folderOrderMap) ?? Number.MAX_SAFE_INTEGER) -
        (getOrder(b, pageOrderMap, folderOrderMap) ?? Number.MAX_SAFE_INTEGER)
    );
}

function buildFolderOrderMap(metaFiles: { path: string; data: Record<string, unknown> }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const meta of metaFiles) {
    const order = meta.data.order as number | undefined;
    if (order === undefined) continue;
    const folderUrl = '/' + meta.path.replace(/\/meta\.json$/, '');
    map.set(folderUrl, order);
  }
  return map;
}

function sortTreeByOrder(tree: Root, pages: { url: string; data: unknown }[], metaFiles: { path: string; data: Record<string, unknown> }[]): Root {
  const pageOrderMap = new Map<string, number>();
  for (const page of pages) {
    const d = page.data as Record<string, unknown>;
    const order = d.order as number | undefined;
    if (order !== undefined) pageOrderMap.set(page.url, order);
    if (page.url === '/') pageOrderMap.set('/', order ?? 0);
  }
  const folderOrderMap = buildFolderOrderMap(metaFiles);
  return { ...tree, children: sortNodes(tree.children, pageOrderMap, folderOrderMap) };
}

/**
 * Copies each page's `short` frontmatter onto its node in the tree, so a sidebar
 * can label a link without having to look the page up again. Nodes for pages
 * that set no `short` are left exactly as they were.
 */
function attachShortNames(
  tree: Root,
  pages: { url: string; data: unknown }[],
): Root {
  const shortByUrl = new Map<string, string>();
  for (const page of pages) {
    const short = (page.data as Record<string, unknown>).short;
    if (typeof short === 'string' && short.length > 0) {
      shortByUrl.set(page.url, short);
    }
  }
  if (shortByUrl.size === 0) return tree;

  const withShort = (node: Item): Item => {
    const short = shortByUrl.get(node.url);
    if (!short) return node;
    // fumadocs' `Item` has no `short`, so widen rather than cast a literal.
    const labelled: Item & { short: string } = { ...node, short };
    return labelled;
  };

  function walk(nodes: Node[]): Node[] {
    return nodes.map(node => {
      if (node.type === NodeType.Folder) {
        const folder = { ...node, children: walk(node.children) } as Folder;
        // Only touch `index` when there is one. Writing the key back as
        // `undefined` gives the folder an `index` it never had, and compactTree
        // walks every key it keeps — including that one.
        if (node.index) folder.index = withShort(node.index);
        return folder;
      }
      if (node.type !== NodeType.Page) return node;
      return withShort(node);
    });
  }

  return { ...tree, children: walk(tree.children) };
}

function filterDraftsFromTree(tree: Root, draftUrls: Set<string>): Root {
  function filterNodes(nodes: Node[]): Node[] {
    return nodes
      .filter(n => n.type !== NodeType.Page || !draftUrls.has(n.url))
      .map(n => n.type === NodeType.Folder
        ? { ...n, children: filterNodes(n.children) } as Folder
        : n
      );
  }
  return { ...tree, children: filterNodes(tree.children) };
}

export async function getPageTree(): Promise<Root> {
  if (cachedTree) return cachedTree;
  const s = await getSource();
  const metaFiles = buildFiles().filter(f => f.type === 'meta') as { path: string; data: Record<string, unknown> }[];
  const pages = s.getPages();
  const sorted = attachShortNames(
    sortTreeByOrder(s.pageTree as Root, pages, metaFiles),
    pages,
  );
  const draftUrls = new Set(pages.filter(p => isDraft(p)).map(p => p.url));
  cachedTree = draftUrls.size > 0 ? filterDraftsFromTree(sorted, draftUrls) : sorted;
  return cachedTree;
}

export async function getPages() {
  const s = await getSource();
  return s.getPages().filter(p => !isDraft(p));
}

export async function getPage(slugs?: string[]) {
  const s = await getSource();
  return s.getPage(slugs);
}

export async function getPageTreeForVersion(ctx: VersionContext): Promise<Root> {
  const tree = await getPageTree();
  return filterPageTreeByVersion(tree, ctx, loadConfig());
}

export async function getPagesForVersion(ctx: VersionContext) {
  const pages = await getPages();
  return filterPagesByVersion(pages, ctx, loadConfig());
}

export function getVersionContextForUrl(url: string): VersionContext {
  return resolveVersionFromUrl(url, loadConfig());
}

export type { VersionContext } from './version-source';

function titleFromUrl(url: string): string {
  if (url === '/') return 'Home';
  const last = url.split('/').filter(Boolean).pop();
  if (!last) return 'Home';
  return last
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function getNavMap(): Promise<Map<string, PageNav>> {
  if (cachedNavMap) return cachedNavMap;
  const tree = await getPageTree();
  const pages = flattenTree(tree.children);
  const toLink = (p: (typeof pages)[number]): PageNavLink => ({
    url: p.url,
    title:
      typeof p.name === 'string' && p.name.length > 0
        ? p.name
        : titleFromUrl(p.url)
  });
  const navMap = new Map<string, PageNav>();
  for (let i = 0; i < pages.length; i++) {
    navMap.set(pages[i].url, {
      prev: i > 0 ? toLink(pages[i - 1]) : null,
      next: i < pages.length - 1 ? toLink(pages[i + 1]) : null
    });
  }
  cachedNavMap = navMap;
  return cachedNavMap;
}

export async function getPageNav(slug: string[]): Promise<PageNav> {
  const navMap = await getNavMap();
  const url = slug.length === 0 ? '/' : `/${slug.join('/')}`;
  return navMap.get(url) ?? { prev: null, next: null };
}

export function extractFrontmatter(page: { data: unknown }, fallbackTitle?: string): Frontmatter {
  const d = page.data as Record<string, unknown>;
  return {
    title: (d.title as string) ?? fallbackTitle ?? 'Untitled',
    description: d.description as string | undefined,
    order: d.order as number | undefined,
    icon: d.icon as string | undefined,
    lastModified: d.lastModified as string | undefined,
    authors: normalizeAuthorList(d.authors),
    draft: d.draft as boolean | undefined,
    _readingTime: d._readingTime as number | undefined,
  };
}

export function isDraft(page: { data: unknown }): boolean {
  return (page.data as Record<string, unknown>).draft === true;
}

export function getRelativePath(page: { data: unknown }): string {
  return ((page.data as Record<string, unknown>)._relativePath as string) ?? '';
}

export function getOriginalPath(page: { data: unknown }): string {
  return ((page.data as Record<string, unknown>)._originalPath as string) ?? '';
}

export function getPageImages(page: { data: unknown }): string[] {
  return ((page.data as Record<string, unknown>)._images as string[]) ?? [];
}

export async function getPageSearchContent(page: { data: unknown }): Promise<{ headings: string; body: string }> {
  const originalPath = getOriginalPath(page);
  if (!originalPath) return { headings: '', body: '' };
  try {
    const contentDir = typeof __CHRONICLE_CONTENT_DIR__ !== 'undefined' ? __CHRONICLE_CONTENT_DIR__ : process.cwd();
    const filePath = path.resolve(contentDir, originalPath);
    const raw = await fs.readFile(filePath, 'utf-8');
    const withoutFrontmatter = raw.replace(/^---[\s\S]*?---/m, '');
    const headings: string[] = [];
    const lines: string[] = [];
    for (const line of withoutFrontmatter.split('\n')) {
      const headingMatch = line.match(/^#{1,6}\s+(.+)/);
      if (headingMatch) {
        headings.push(headingMatch[1]);
      } else if (!line.startsWith('import ') && !line.startsWith('export ') && !line.startsWith('```')) {
        const cleaned = line
          .replace(/<[^>]+>/g, '')
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
          .replace(/[*_~`]+/g, '')
          .trim();
        if (cleaned) lines.push(cleaned);
      }
    }
    return { headings: headings.join('\n'), body: lines.join(' ') };
  } catch {
    return { headings: '', body: '' };
  }
}

interface ReadingTime {
  text: string;
  minutes: number;
  words: number;
  time: number;
}

const ssrModules = import.meta.glob<{ default?: MDXContent; toc?: TableOfContents; readingTime?: ReadingTime }>(
  '../../.content/**/*.{mdx,md}'
);

export async function loadPageModule(
  relativePath: string
): Promise<{ default: MDXContent | null; toc: TableOfContents; _readingTime?: number }> {
  if (!relativePath || relativePath.includes('..')) return { default: null, toc: [] };
  const withoutExt = relativePath.replace(/\.(mdx|md)$/, '');
  const key = relativePath.endsWith('.md')
    ? `../../.content/${withoutExt}.md`
    : `../../.content/${withoutExt}.mdx`;
  const loader = ssrModules[key];
  if (!loader) return { default: null, toc: [] };
  const mod = await loader();
  const minutes = mod.readingTime?.minutes;
  return { default: mod.default ?? null, toc: mod.toc ?? [], _readingTime: minutes != null ? Math.max(1, Math.round(minutes)) : undefined };
}
