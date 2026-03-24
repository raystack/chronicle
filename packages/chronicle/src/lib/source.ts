import fs from 'node:fs/promises';
import path from 'node:path';
import { loader } from 'fumadocs-core/source';
import type { Root, Node, Folder } from 'fumadocs-core/page-tree';
import matter from 'gray-matter';
import type { MDXContent } from 'mdx/types';
import type { TableOfContents } from 'fumadocs-core/toc';
import type { Frontmatter } from '@/types';

function getContentDir(): string {
  return __CHRONICLE_CONTENT_DIR__ || path.join(process.cwd(), 'content');
}

async function scanFiles(contentDir: string) {
  const files: {
    type: 'page' | 'meta';
    path: string;
    data: Record<string, unknown>;
  }[] = [];

  async function scan(dir: string, prefix: string[] = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules')
          continue;
        const fullPath = path.join(dir, entry.name);
        const relativePath = [...prefix, entry.name].join('/');

        if (entry.isDirectory()) {
          await scan(fullPath, [...prefix, entry.name]);
          continue;
        }

        if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
          const raw = await fs.readFile(fullPath, 'utf-8');
          const { data } = matter(raw);
          files.push({
            type: 'page',
            path: relativePath,
            data: { ...data, _relativePath: relativePath }
          });
        } else if (entry.name === 'meta.json' || entry.name === 'meta.yaml') {
          const raw = await fs.readFile(fullPath, 'utf-8');
          const data = entry.name.endsWith('.json')
            ? JSON.parse(raw)
            : matter(raw).data;
          files.push({ type: 'meta', path: relativePath, data });
        }
      }
    } catch {
      /* directory not readable */
    }
  }

  await scan(contentDir);
  return files;
}

let cachedSource: ReturnType<typeof loader> | null = null;

async function getSource() {
  if (cachedSource) return cachedSource;
  const contentDir = getContentDir();
  const files = await scanFiles(contentDir);
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

export async function loadPageModule(
  relativePath: string
): Promise<{ default: MDXContent | null; toc: TableOfContents }> {
  if (!relativePath) return { default: null, toc: [] };
  const contentDir = getContentDir();
  const fullPath = path.join(contentDir, relativePath);
  try {
    await fs.access(fullPath);
  } catch {
    return { default: null, toc: [] };
  }
  const withoutExt = relativePath.replace(/\.(mdx|md)$/, '');
  const mod = relativePath.endsWith('.md')
    ? await import(`../../.content/${withoutExt}.md`)
    : await import(`../../.content/${withoutExt}.mdx`);
  return { default: mod.default ?? null, toc: mod.toc ?? [] };
}
