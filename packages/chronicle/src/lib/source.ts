import { loader } from 'fumadocs-core/source';
import { flattenTree } from 'fumadocs-core/page-tree';
import type { Root, Node, Folder } from 'fumadocs-core/page-tree';
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
    files.push({
      type: 'page',
      path: relativePath,
      data: { ...data, _relativePath: relativePath, _originalPath: originalPath }
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

let cachedSource: ReturnType<typeof loader> | null = null;

async function getSource() {
  if (cachedSource) return cachedSource;
  const files = buildFiles();
  cachedSource = loader({
    source: { files },
    baseUrl: '/'
  });
  return cachedSource;
}

export { getSource as source };

export function invalidate() {
  cachedSource = null;
}

function getOrder(node: Node, orderMap: Map<string, number>): number | undefined {
  if (node.type === 'page') return orderMap.get(node.url);
  if (node.type === 'folder' && node.index) return orderMap.get(node.index.url);
  return undefined;
}

function sortNodes(nodes: Node[], orderMap: Map<string, number>): Node[] {
  return [...nodes]
    .map(n =>
      n.type === 'folder'
        ? ({ ...n, children: sortNodes(n.children, orderMap) } as Folder)
        : n
    )
    .sort(
      (a, b) =>
        (getOrder(a, orderMap) ?? Number.MAX_SAFE_INTEGER) -
        (getOrder(b, orderMap) ?? Number.MAX_SAFE_INTEGER)
    );
}

function sortTreeByOrder(tree: Root, pages: { url: string; data: unknown }[]): Root {
  const orderMap = new Map<string, number>();
  for (const page of pages) {
    const d = page.data as Record<string, unknown>;
    const order = d.order as number | undefined;
    if (order !== undefined) orderMap.set(page.url, order);
    if (page.url === '/') orderMap.set('/', order ?? 0);
  }
  return { ...tree, children: sortNodes(tree.children, orderMap) };
}

export async function getPageTree(): Promise<Root> {
  const s = await getSource();
  return sortTreeByOrder(s.pageTree as Root, s.getPages());
}

export async function getPages() {
  const s = await getSource();
  return s.getPages();
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

export async function getPageNav(slug: string[]): Promise<PageNav> {
  const tree = await getPageTree();
  const pages = flattenTree(tree.children);
  const url = slug.length === 0 ? '/' : `/${slug.join('/')}`;
  const i = pages.findIndex(p => p.url === url);
  if (i < 0) return { prev: null, next: null };
  const toLink = (p: (typeof pages)[number]): PageNavLink => ({
    url: p.url,
    title: typeof p.name === 'string' ? p.name : ''
  });
  return {
    prev: i > 0 ? toLink(pages[i - 1]) : null,
    next: i < pages.length - 1 ? toLink(pages[i + 1]) : null
  };
}

export function extractFrontmatter(page: { data: unknown }, fallbackTitle?: string): Frontmatter {
  const d = page.data as Record<string, unknown>;
  return {
    title: (d.title as string) ?? fallbackTitle ?? 'Untitled',
    description: d.description as string | undefined,
    order: d.order as number | undefined,
    icon: d.icon as string | undefined,
    lastModified: d.lastModified as string | undefined,
  };
}

export function getRelativePath(page: { data: unknown }): string {
  return ((page.data as Record<string, unknown>)._relativePath as string) ?? '';
}

export function getOriginalPath(page: { data: unknown }): string {
  return ((page.data as Record<string, unknown>)._originalPath as string) ?? '';
}

const ssrModules = import.meta.glob<{ default?: MDXContent; toc?: TableOfContents }>(
  '../../.content/**/*.{mdx,md}'
);

export async function loadPageModule(
  relativePath: string
): Promise<{ default: MDXContent | null; toc: TableOfContents }> {
  if (!relativePath || relativePath.includes('..')) return { default: null, toc: [] };
  const withoutExt = relativePath.replace(/\.(mdx|md)$/, '');
  const key = relativePath.endsWith('.md')
    ? `../../.content/${withoutExt}.md`
    : `../../.content/${withoutExt}.mdx`;
  const loader = ssrModules[key];
  if (!loader) return { default: null, toc: [] };
  const mod = await loader();
  return { default: mod.default ?? null, toc: mod.toc ?? [] };
}
