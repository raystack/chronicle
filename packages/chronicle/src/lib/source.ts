import fs from 'node:fs/promises';
import path from 'node:path';
import { loader } from 'fumadocs-core/source';
import matter from 'gray-matter';
import type { MDXContent } from 'mdx/types';
import type { Frontmatter, PageTree, PageTreeItem } from '@/types';

export interface SourcePage {
  url: string;
  slugs: string[];
  filePath: string;
  frontmatter: Frontmatter;
}

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
            data: { ...data, _absolutePath: fullPath }
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
let cachedPages: SourcePage[] | null = null;

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

export function invalidate() {
  cachedSource = null;
  cachedPages = null;
}

export async function getPages(): Promise<SourcePage[]> {
  if (cachedPages) return cachedPages;

  const s = await getSource();
  cachedPages = s.getPages().map(page => {
    const data = page.data as Record<string, unknown>;
    return {
      url: page.url,
      slugs: page.slugs,
      filePath: (data._absolutePath as string) ?? '',
      frontmatter: {
        title:
          (data.title as string) ??
          page.slugs[page.slugs.length - 1] ??
          'Untitled',
        description: data.description as string | undefined,
        order: data.order as number | undefined,
        icon: data.icon as string | undefined,
        lastModified: data.lastModified as string | undefined
      }
    };
  });

  return cachedPages;
}

export async function getPage(slug?: string[]): Promise<SourcePage | null> {
  const pages = await getPages();
  const targetUrl = !slug || slug.length === 0 ? '/' : `/${slug.join('/')}`;
  return pages.find(p => p.url === targetUrl) ?? null;
}

export async function loadPageComponent(
  page: SourcePage
): Promise<MDXContent | null> {
  if (!page.filePath) return null;
  try {
    await fs.access(page.filePath);
  } catch {
    return null;
  }
  const contentDir = getContentDir();
  const relativePath = path.relative(contentDir, page.filePath);
  const withoutExt = relativePath.replace(/\.(mdx|md)$/, '');
  const mod = relativePath.endsWith('.md')
    ? await import(`../../.content/${withoutExt}.md`)
    : await import(`../../.content/${withoutExt}.mdx`);
  return mod.default;
}

export async function buildPageTree(): Promise<PageTree> {
  const s = await getSource();
  const pages = s.getPages();
  const folders = new Map<string, PageTreeItem[]>();
  const rootPages: PageTreeItem[] = [];

  for (const page of pages) {
    const data = page.data as Record<string, unknown>;
    const isIndex = page.url === '/';
    const item: PageTreeItem = {
      type: 'page',
      name: (data.title as string) ?? page.slugs.join('/') ?? 'Untitled',
      url: page.url,
      order: (data.order as number | undefined) ?? (isIndex ? 0 : undefined)
    };

    if (page.slugs.length > 1) {
      const folder = page.slugs[0];
      if (!folders.has(folder)) {
        folders.set(folder, []);
      }
      folders.get(folder)?.push(item);
    } else {
      rootPages.push(item);
    }
  }

  const sortByOrder = (items: PageTreeItem[]) =>
    items.sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER)
    );

  const children: PageTreeItem[] = sortByOrder(rootPages);

  const folderItems: PageTreeItem[] = [];
  for (const [folder, items] of folders) {
    const sorted = sortByOrder(items);
    const indexPage = items.find(item => item.url === `/${folder}`);
    const folderOrder = indexPage?.order ?? sorted[0]?.order;
    folderItems.push({
      type: 'folder',
      name: `${folder.charAt(0).toUpperCase()}${folder.slice(1)}`,
      order: folderOrder,
      children: sorted
    });
  }

  children.push(...sortByOrder(folderItems));

  return { name: 'root', children };
}
