import type { Folder, Node, Root } from 'fumadocs-core/page-tree';
import type { ChronicleConfig } from '@/types';
import type { VersionContext } from './version-source';

const KEEP_FIELDS = new Set(['type', 'name', 'url', 'icon', 'children', 'index']);

function compactNode(node: Node): Node {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (!KEEP_FIELDS.has(k)) continue;
    if (k === 'children') out.children = (v as Node[]).map(compactNode);
    else if (k === 'index') out.index = compactNode(v as Node);
    else out[k] = v;
  }
  return out as Node;
}

export function compactTree(tree: Root): Root {
  return { ...tree, children: tree.children.map(compactNode) };
}

export const NodeType = {
  Page: 'page',
  Folder: 'folder',
  Separator: 'separator',
} as const;

export function getFirstPageUrl(nodes: Node[]): string | null {
  for (const node of nodes) {
    if (node.type === NodeType.Page) return node.url;
    if (node.type === NodeType.Folder) {
      const url = getFirstPageUrl(node.children);
      if (url) return url;
    }
  }
  return null;
}

function getFolderPath(node: Node): string | null {
  if (node.type !== NodeType.Folder) return null;
  if (node.index) return node.index.url;
  const firstPage = getFirstPageUrl(node.children);
  if (!firstPage) return null;
  const parts = firstPage.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

export function findFolderFirstPage(nodes: Node[], pathname: string): string | null {
  for (const node of nodes) {
    if (node.type === NodeType.Folder) {
      const folderPath = getFolderPath(node);
      if (folderPath === pathname) return getFirstPageUrl(node.children);
      const found = findFolderFirstPage(node.children, pathname);
      if (found) return found;
    }
  }
  return null;
}

export function resolveDocsRedirect(
  slug: string[],
  tree: { children: Node[] },
  contentConfig?: { dir: string; index_page?: string },
): string | null {
  const isContentRoot = slug.length === 1 && slug[0] === contentConfig?.dir;

  if (isContentRoot) {
    if (contentConfig?.index_page) {
      return `/${contentConfig.dir}/${contentConfig.index_page}`;
    }
    return getFirstPageUrl(tree.children);
  }

  return findFolderFirstPage(tree.children, `/${slug.join('/')}`);
}

interface ResolvePageDeps {
  getPage: (slug: string[]) => Promise<unknown>;
  getPageTree: () => Promise<{ children: Node[] }>;
  isDraft: (page: unknown) => boolean;
  config: ChronicleConfig;
  version: VersionContext;
}

export async function resolvePageAndSlug(slug: string[], deps: ResolvePageDeps) {
  const { getPage, getPageTree, isDraft, config, version } = deps;

  const page = await getPage(slug);
  if (page && !isDraft(page)) return { page, slug };

  const slugWithoutVersion = version.dir && slug[0] === version.dir
    ? slug.slice(1)
    : slug;

  const tree = await getPageTree();
  const contentEntries = version.dir
    ? config.versions?.find(v => v.dir === version.dir)?.content ?? config.content
    : config.content;
  const contentConfig = contentEntries?.find(c => c.dir === slugWithoutVersion[0]);
  const redirectUrl = resolveDocsRedirect(slugWithoutVersion, tree, contentConfig);
  if (!redirectUrl) return null;

  const fullUrl = version.urlPrefix ? `${version.urlPrefix}${redirectUrl}` : redirectUrl;
  const resolvedSlug = fullUrl.split('/').filter(Boolean);
  const resolvedPage = await getPage(resolvedSlug);
  if (!resolvedPage || isDraft(resolvedPage)) return null;

  return { page: resolvedPage, slug: resolvedSlug };
}
