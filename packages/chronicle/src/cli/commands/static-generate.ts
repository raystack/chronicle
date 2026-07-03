import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import chalk from 'chalk';
import type { OpenAPIV3 } from 'openapi-types';
import satori from 'satori';
import sharp from 'sharp';
import {
  type ChronicleConfig,
  SearchResultType,
} from '@/types';
import {
  getAllVersions,
  getApiConfigsForVersion,
  getLatestContentRoots,
  getVersionContentRoots,
} from '@/lib/config';
import { loadApiSpec, resolveDocument, type ApiSpec } from '@/lib/openapi';
import { buildApiRoutes, getSpecSlug } from '@/lib/api-routes';
import { buildLlmsTxt, type LlmsPage } from '@/lib/llms';
import { DEFAULT_WIDTH, DEFAULT_QUALITY, isLocalImage, isSvg, splitVersion } from '@/lib/image-utils';
import { getAssetVersion } from '@/lib/asset-version';
import type { VersionContext } from '@/lib/version-source';
import type { Frontmatter, PageNavLink } from '@/types';

export interface StaticGenerateOptions {
  projectRoot: string;
  config: ChronicleConfig;
  outputDir: string;
  packageRoot: string;
}

// --- Filesystem-based content scanning (follows build-search-index.ts pattern) ---

interface ScannedPage {
  slugs: string[];
  url: string;
  relativePath: string;
  originalPath: string;
  frontmatter: Frontmatter;
  rawContent: string;
  images: string[];
}

interface PageTreeNode {
  type: 'page' | 'folder' | 'separator';
  name: string;
  url: string;
  icon?: string;
  $order?: number;
  children?: PageTreeNode[];
  index?: PageTreeNode;
}

interface PageTreeRoot {
  name: string;
  children: PageTreeNode[];
}

interface SearchDocument {
  id: string;
  url: string;
  title: string;
  headings: string;
  body: string;
  type: string;
  section: string;
}

function extractHeadingsAndBody(markdown: string): { headings: string; body: string } {
  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---/m, '');
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
}

function extractImages(markdown: string): string[] {
  const images: string[] = [];
  const seen = new Set<string>();
  function add(src: string) {
    const clean = src.split('?')[0];
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      images.push(clean);
    }
  }
  const mdRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(markdown)) !== null) add(match[1]);
  const htmlRegex = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  while ((match = htmlRegex.exec(markdown)) !== null) add(match[1]);
  return images;
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function scanContentDir(
  contentDir: string,
  contentMirrorRoot: string,
  prefix: string[] = [],
): Promise<ScannedPage[]> {
  const pages: ScannedPage[] = [];

  async function scan(dir: string, slugPrefix: string[]) {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath, [...slugPrefix, entry.name]);
        continue;
      }

      if (!entry.name.endsWith('.mdx') && !entry.name.endsWith('.md')) continue;

      const raw = await fs.readFile(fullPath, 'utf-8');
      const { data: fm, content } = matter(raw);

      if (fm.draft === true) continue;

      const baseName = entry.name.replace(/\.(mdx|md)$/, '');
      const isIndex = baseName === 'index' || baseName.toLowerCase() === 'readme';
      const slugs = isIndex ? slugPrefix : [...slugPrefix, baseName];
      const url = slugs.length === 0 ? '/' : `/${slugs.join('/')}`;

      const originalRelative = path.relative(contentMirrorRoot, fullPath);
      const normalizedRelative = isIndex && baseName.toLowerCase() === 'readme'
        ? originalRelative.replace(/readme\.(mdx?)$/i, `index.$1`)
        : originalRelative;

      pages.push({
        slugs,
        url,
        relativePath: normalizedRelative,
        originalPath: originalRelative,
        frontmatter: {
          title: (fm.title as string) ?? titleFromSlug(slugs[slugs.length - 1] ?? 'Home'),
          description: fm.description as string | undefined,
          order: fm.order as number | undefined,
          icon: fm.icon as string | undefined,
          lastModified: fm.lastModified as string | undefined,
          draft: fm.draft as boolean | undefined,
        },
        rawContent: content,
        images: extractImages(content).map(img => {
          if (img.startsWith('http')) return img;
          const relative = img.startsWith('/')
            ? img.slice(1)
            : path.join(path.dirname(normalizedRelative), img).replace(/\\/g, '/');
          const url = `/_content/${relative}`;
          const version = getAssetVersion(path.join(contentMirrorRoot, relative));
          return version ? `${url}?v=${version}` : url;
        }),
      });
    }
  }

  await scan(contentDir, prefix);

  pages.sort((a, b) => {
    const orderA = a.frontmatter.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.frontmatter.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.url.localeCompare(b.url);
  });

  return pages;
}

async function scanAllContent(
  projectRoot: string,
  config: ChronicleConfig,
  packageRoot: string,
): Promise<ScannedPage[]> {
  const contentMirror = path.resolve(packageRoot, '.content');
  const pages: ScannedPage[] = [];

  for (const root of getLatestContentRoots(config)) {
    const contentDir = path.resolve(contentMirror, root.contentDir);
    const scanned = await scanContentDir(contentDir, contentMirror, [root.contentDir]);
    pages.push(...scanned);
  }

  for (const version of config.versions ?? []) {
    for (const root of getVersionContentRoots(config, version.dir)) {
      const contentDir = path.resolve(contentMirror, version.dir, root.contentDir);
      const scanned = await scanContentDir(contentDir, contentMirror, [version.dir, root.contentDir]);
      pages.push(...scanned);
    }
  }

  return pages;
}

interface FolderMeta {
  title?: string;
  order?: number;
}

async function scanFolderMeta(
  contentMirrorRoot: string,
  config: ChronicleConfig,
): Promise<Map<string, FolderMeta>> {
  const metaMap = new Map<string, FolderMeta>();

  async function scanDir(dir: string, slugPrefix: string[]) {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const metaPath = path.join(dir, 'meta.json');
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(raw) as FolderMeta;
      const folderPath = '/' + slugPrefix.join('/');
      metaMap.set(folderPath, meta);
    } catch {
      // no meta.json
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      await scanDir(path.join(dir, entry.name), [...slugPrefix, entry.name]);
    }
  }

  for (const root of getLatestContentRoots(config)) {
    const contentDir = path.resolve(contentMirrorRoot, root.contentDir);
    await scanDir(contentDir, [root.contentDir]);
  }
  for (const version of config.versions ?? []) {
    for (const root of getVersionContentRoots(config, version.dir)) {
      const contentDir = path.resolve(contentMirrorRoot, version.dir, root.contentDir);
      await scanDir(contentDir, [version.dir, root.contentDir]);
    }
  }

  return metaMap;
}

function buildPageTree(pages: ScannedPage[], config: ChronicleConfig, folderMeta: Map<string, FolderMeta>): PageTreeRoot {
  const tree: PageTreeRoot = { name: 'root', children: [] };
  const folderMap = new Map<string, PageTreeNode>();

  for (const page of pages) {
    const segments = page.slugs;
    if (segments.length === 0) continue;

    let current = tree.children;
    for (let i = 0; i < segments.length - 1; i++) {
      const folderPath = '/' + segments.slice(0, i + 1).join('/');
      let folder = folderMap.get(folderPath);
      if (!folder) {
        const meta = folderMeta.get(folderPath);
        folder = {
          type: 'folder',
          name: meta?.title ?? titleFromSlug(segments[i]),
          url: folderPath,
          $order: meta?.order,
          children: [],
        };
        folderMap.set(folderPath, folder);
        current.push(folder);
      }
      current = folder.children!;
    }

    const pageNode: PageTreeNode = {
      type: 'page',
      name: page.frontmatter.title,
      url: page.url,
      icon: page.frontmatter.icon,
      $order: page.frontmatter.order,
    };

    // Check if this is a folder index page
    const folderPath = '/' + segments.slice(0, -1).join('/');
    const parentFolder = folderMap.get(folderPath);
    if (parentFolder && segments.length > 1) {
      const isIndex = page.relativePath.match(/(index|readme)\.(mdx|md)$/i);
      if (isIndex) {
        parentFolder.index = pageNode;
        parentFolder.name = page.frontmatter.title;
        continue;
      }
    }

    current.push(pageNode);
  }

  for (const root of getLatestContentRoots(config)) {
    const rootFolder = folderMap.get(`/${root.contentDir}`);
    if (rootFolder) {
      rootFolder.name = root.contentLabel;
    }
  }

  function sortChildren(children: PageTreeNode[]) {
    children.sort((a, b) => {
      const orderA = a.$order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.$order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
    for (const child of children) {
      if (child.children) sortChildren(child.children);
    }
  }
  sortChildren(tree.children);

  function stripOrder(node: PageTreeNode) {
    delete node.$order;
    if (node.children) node.children.forEach(stripOrder);
    if (node.index) delete node.index.$order;
  }
  tree.children.forEach(stripOrder);

  return tree;
}

function flattenTreeUrls(tree: PageTreeRoot): { url: string; title: string }[] {
  const result: { url: string; title: string }[] = [];
  function walk(nodes: PageTreeNode[]) {
    for (const node of nodes) {
      if (node.type === 'folder') {
        if (node.index) result.push({ url: node.index.url, title: node.index.name });
        if (node.children) walk(node.children);
      } else if (node.type === 'page') {
        result.push({ url: node.url, title: node.name });
      }
    }
  }
  walk(tree.children);
  return result;
}

function computeNavigation(tree: PageTreeRoot): Map<string, { prev: PageNavLink | null; next: PageNavLink | null }> {
  const navMap = new Map<string, { prev: PageNavLink | null; next: PageNavLink | null }>();
  const ordered = flattenTreeUrls(tree);

  for (let i = 0; i < ordered.length; i++) {
    navMap.set(ordered[i].url, {
      prev: i > 0
        ? { url: ordered[i - 1].url, title: ordered[i - 1].title }
        : null,
      next: i < ordered.length - 1
        ? { url: ordered[i + 1].url, title: ordered[i + 1].title }
        : null,
    });
  }

  return navMap;
}

async function loadSpecs(configs: import('@/types').ApiConfig[], projectRoot: string): Promise<ApiSpec[]> {
  const results: ApiSpec[] = [];
  for (const c of configs) {
    try {
      results.push(await loadApiSpec(c, projectRoot));
    } catch {
      try {
        const specPath = path.resolve(projectRoot, c.spec);
        const raw = await fs.readFile(specPath, 'utf-8');
        const isYaml = specPath.endsWith('.yaml') || specPath.endsWith('.yml');
        const rawDoc = isYaml ? (await import('yaml')).parse(raw) : JSON.parse(raw);
        const doc = rawDoc.openapi?.startsWith('3.') ? resolveDocument(rawDoc) : rawDoc;
        results.push({
          name: c.name,
          basePath: c.basePath,
          server: { ...c.server, url: c.server.url },
          auth: c.auth,
          document: doc,
        });
      } catch {
        console.log(chalk.yellow(`  Warning: Skipping spec ${c.name}`));
      }
    }
  }
  return results;
}

// --- Generation steps ---

async function generatePageDataFiles(
  pages: ScannedPage[],
  navMap: Map<string, { prev: PageNavLink | null; next: PageNavLink | null }>,
  outputDir: string,
): Promise<void> {
  const dataDir = path.join(outputDir, 'data', 'pages');
  await fs.mkdir(dataDir, { recursive: true });

  for (const page of pages) {
    const slugKey = page.slugs.join(',') || 'index';
    const nav = navMap.get(page.url) ?? { prev: null, next: null };

    const data = {
      frontmatter: page.frontmatter,
      relativePath: page.relativePath,
      originalPath: page.originalPath,
      images: page.images,
      prev: nav.prev,
      next: nav.next,
    };

    const filePath = path.join(dataDir, `${slugKey}.json`);
    await fs.writeFile(filePath, JSON.stringify(data));
  }
}

async function generateSearchIndex(
  pages: ScannedPage[],
  config: ChronicleConfig,
  outputDir: string,
  projectRoot: string,
): Promise<void> {
  const docs: SearchDocument[] = [];
  const contentEntries = config.content ?? [];

  for (const page of pages) {
    const { headings, body } = extractHeadingsAndBody(page.rawContent);
    const dir = page.url.replace(/^\//, '').split('/')[0];
    const entry = contentEntries.find(c => c.dir === dir);

    docs.push({
      id: page.url,
      url: page.url,
      title: page.frontmatter.title,
      headings,
      body: [page.frontmatter.description ?? '', body].join(' '),
      type: SearchResultType.Page,
      section: entry?.label ?? dir ?? '',
    });
  }

  // Include API operations
  const apiConfigs = config.api ?? [];
  if (apiConfigs.length) {
    try {
      const specs = await loadSpecs(apiConfigs, projectRoot);
      for (const spec of specs) {
        const specSlug = getSpecSlug(spec);
        const paths = spec.document.paths ?? {};
        for (const [pathStr, pathItem] of Object.entries(paths)) {
          if (!pathItem) continue;
          for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
            const op = pathItem[method] as OpenAPIV3.OperationObject | undefined;
            if (!op) continue;
            const opId = op.operationId ?? `${method}_${pathStr.replace(/[/{}\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
            const url = `/apis/${specSlug}/${encodeURIComponent(opId)}`;
            docs.push({
              id: url,
              url,
              title: `${method.toUpperCase()} ${op.summary ?? opId}`,
              headings: op.summary ?? opId,
              body: [op.description ?? '', pathStr, method.toUpperCase()].join(' '),
              type: SearchResultType.Api,
              section: spec.name,
            });
          }
        }
      }
    } catch {
      console.log(chalk.yellow('  Warning: Failed to load API specs for search index'));
    }
  }

  const dataDir = path.join(outputDir, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, 'search.json'), JSON.stringify(docs));
}

async function generateApiSpecs(
  config: ChronicleConfig,
  outputDir: string,
  projectRoot: string,
): Promise<void> {
  const specsDir = path.join(outputDir, 'data', 'specs');
  await fs.mkdir(specsDir, { recursive: true });

  // Generate latest specs
  const latestConfigs = getApiConfigsForVersion(config, null);
  if (latestConfigs.length) {
    try {
      const specs = await loadSpecs(latestConfigs, projectRoot);
      await fs.writeFile(path.join(specsDir, 'latest.json'), JSON.stringify(specs));
    } catch {
      console.log(chalk.yellow('  Warning: Failed to load latest API specs'));
    }
  }

  // Generate versioned specs
  for (const version of config.versions ?? []) {
    const versionConfigs = getApiConfigsForVersion(config, version.dir);
    if (!versionConfigs.length) continue;
    try {
      const specs = await loadSpecs(versionConfigs, projectRoot);
      await fs.writeFile(path.join(specsDir, `${version.dir}.json`), JSON.stringify(specs));
    } catch {
      console.log(chalk.yellow(`  Warning: Failed to load API specs for version ${version.dir}`));
    }
  }
}

async function generateSitemap(
  pages: ScannedPage[],
  config: ChronicleConfig,
  outputDir: string,
  projectRoot: string,
): Promise<void> {
  if (!config.url) {
    await fs.writeFile(
      path.join(outputDir, 'sitemap.xml'),
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
    );
    return;
  }

  const baseUrl = config.url.replace(/\/$/, '');

  const docPages = pages.map(page => {
    let lastmod = '';
    if (page.frontmatter.lastModified) {
      const d = new Date(page.frontmatter.lastModified);
      if (!Number.isNaN(d.getTime())) lastmod = `<lastmod>${d.toISOString()}</lastmod>`;
    }
    return `<url><loc>${baseUrl}/${page.slugs.join('/')}</loc>${lastmod}</url>`;
  });

  const apiPages: string[] = [];
  for (const v of getAllVersions(config)) {
    const versionDir = v.isLatest ? null : v.dir;
    const apiConfigs = getApiConfigsForVersion(config, versionDir);
    if (!apiConfigs.length) continue;
    const prefix = versionDir ? `/${versionDir}` : '';
    try {
      const routes = buildApiRoutes(await loadSpecs(apiConfigs, projectRoot));
      for (const route of routes) {
        apiPages.push(
          `<url><loc>${baseUrl}${prefix}/apis/${route.slug.join('/')}</loc></url>`,
        );
      }
    } catch {
      // skip if specs fail to load
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${baseUrl}</loc></url>
${[...docPages, ...apiPages].join('\n')}
</urlset>`;

  await fs.writeFile(path.join(outputDir, 'sitemap.xml'), xml);
}

async function generateRobotsTxt(
  config: ChronicleConfig,
  outputDir: string,
): Promise<void> {
  const sitemap = config.url ? `\nSitemap: ${config.url}/sitemap.xml` : '';
  const body = `User-agent: *\nAllow: /${sitemap}`;
  await fs.writeFile(path.join(outputDir, 'robots.txt'), body);
}

async function generateLlmsTxt(
  pages: ScannedPage[],
  config: ChronicleConfig,
  outputDir: string,
): Promise<void> {
  const latestCtx: VersionContext = { dir: null, urlPrefix: '' };

  // Filter to only latest pages (not versioned)
  const versionPrefixes = (config.versions ?? []).map(v => `/${v.dir}`);
  const latestPages = pages.filter(
    p => !versionPrefixes.some(pre => p.url === pre || p.url.startsWith(`${pre}/`)),
  );

  const llmsPages: LlmsPage[] = latestPages.map(p => ({
    url: p.url,
    title: p.frontmatter.title,
  }));

  const body = buildLlmsTxt(config, llmsPages, latestCtx);
  await fs.writeFile(path.join(outputDir, 'llms.txt'), body);
}

async function generateOgImages(
  pages: ScannedPage[],
  config: ChronicleConfig,
  outputDir: string,
  packageRoot: string,
): Promise<void> {
  const ogDir = path.join(outputDir, 'og');
  await fs.mkdir(ogDir, { recursive: true });

  const { loadFont } = await import('@/server/routes/og-utils');
  const fontData = await loadFont(packageRoot);

  const siteName = config.site.title;

  for (const page of pages) {
    const title = page.frontmatter.title;
    const description = page.frontmatter.description ?? '';
    const slugKey = page.slugs.join(',') || 'index';

    try {
      // Using React.createElement since we can't use JSX in a CLI context
      // without additional build config. Satori accepts React elements.
      const { createElement: h } = await import('react');

      const svg = await satori(
        h('div', {
          style: {
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 80px',
            backgroundColor: '#0a0a0a',
            color: '#fafafa',
          },
        },
          h('div', { style: { fontSize: 24, color: '#888', marginBottom: 16 } }, siteName),
          h('div', {
            style: {
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: 24,
            },
          }, title),
          description
            ? h('div', { style: { fontSize: 24, color: '#999', lineHeight: 1.4 } }, description)
            : null,
        ),
        {
          width: 1200,
          height: 630,
          fonts: [
            { name: 'Inter', data: fontData, weight: 400, style: 'normal' as const },
          ],
        },
      );

      const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      await fs.writeFile(path.join(ogDir, `${slugKey}.png`), pngBuffer);
    } catch {
      // Skip pages that fail OG generation
    }
  }
}

async function optimizeImages(
  pages: ScannedPage[],
  packageRoot: string,
  outputDir: string,
): Promise<void> {
  const contentDir = path.resolve(packageRoot, '.content');
  const seen = new Set<string>();
  let optimized = 0;

  for (const page of pages) {
    for (const imgUrl of page.images) {
      const { base } = splitVersion(imgUrl);
      if (!isLocalImage(base) || seen.has(base)) continue;
      seen.add(base);

      const relativePath = base.replace(/^\/_content\//, '');
      const srcPath = path.resolve(contentDir, relativePath);
      if (!srcPath.startsWith(contentDir + path.sep) && srcPath !== contentDir) continue;

      if (isSvg(base)) {
        const destPath = path.join(outputDir, '_content', relativePath);
        try {
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(srcPath, destPath);
          optimized++;
        } catch {
          // skip missing files
        }
        continue;
      }

      const webpRelative = relativePath.replace(/\.[^.]+$/, '.webp');
      const destPath = path.join(outputDir, '_content', webpRelative);

      try {
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        const source = await fs.readFile(srcPath);
        const optimizedBuf = await sharp(source)
          .resize({ width: DEFAULT_WIDTH, withoutEnlargement: true })
          .webp({ quality: DEFAULT_QUALITY })
          .toBuffer();
        await fs.writeFile(destPath, optimizedBuf);

        // Also copy original for fallback
        const origDest = path.join(outputDir, '_content', relativePath);
        await fs.mkdir(path.dirname(origDest), { recursive: true });
        await fs.copyFile(srcPath, origDest);

        optimized++;
      } catch {
        // skip unprocessable images
      }
    }
  }

  if (optimized > 0) {
    console.log(chalk.gray(`  Optimized ${optimized} images`));
  }
}

async function copyPublicAssets(
  projectRoot: string,
  outputDir: string,
): Promise<void> {
  const publicDir = path.resolve(projectRoot, 'public');
  if (!existsSync(publicDir)) return;

  async function copyTree(src: string, dest: string) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    await fs.mkdir(dest, { recursive: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyTree(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  await copyTree(publicDir, outputDir);
}

interface ViteManifestEntry {
  file: string;
  src?: string;
  isEntry?: boolean;
  css?: string[];
  imports?: string[];
}

type ViteManifest = Record<string, ViteManifestEntry>;

function readViteManifest(outputDir: string): ViteManifest | null {
  // Try multiple known locations for the Vite manifest
  const candidates = [
    path.join(outputDir, '.vite', 'manifest.json'),
    path.join(outputDir, 'assets', '.vite', 'manifest.json'),
    path.join(outputDir, '.vite/manifest.json'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        const raw = readFileSync(candidate, 'utf-8');
        return JSON.parse(raw) as ViteManifest;
      } catch {
        continue;
      }
    }
  }

  return null;
}

async function generateSpaIndex(
  config: ChronicleConfig,
  tree: PageTreeRoot,
  outputDir: string,
): Promise<void> {
  const manifest = readViteManifest(outputDir);

  let entryJs = '';
  const cssFiles: string[] = [];
  const preloadFiles: string[] = [];

  if (manifest) {
    // Find the entry point — look for the static entry or client entry
    for (const [, entry] of Object.entries(manifest)) {
      if (entry.isEntry) {
        entryJs = `/${entry.file}`;
        if (entry.css) {
          cssFiles.push(...entry.css.map(f => `/${f}`));
        }
        if (entry.imports) {
          for (const imp of entry.imports) {
            const impEntry = manifest[imp];
            if (impEntry) {
              preloadFiles.push(`/${impEntry.file}`);
              if (impEntry.css) {
                cssFiles.push(...impEntry.css.map(f => `/${f}`));
              }
            }
          }
        }
        break;
      }
    }
  }

  if (!entryJs) {
    throw new Error('Could not determine Vite client entry from manifest — static index generation aborted');
  }

  const latestCtx: VersionContext = { dir: null, urlPrefix: '' };
  const pageData = {
    config,
    tree,
    version: latestCtx,
  };
  const safeJson = JSON.stringify(pageData).replace(/</g, '\\u003c');

  const cssLinks = [...new Set(cssFiles)]
    .map(f => `  <link rel="stylesheet" href="${f}">`)
    .join('\n');

  const preloadLinks = [...new Set(preloadFiles)]
    .map(f => `  <link rel="modulepreload" href="${f}">`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.ico">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
${cssLinks}
${preloadLinks}
  <script type="module" src="${entryJs}"></script>
  <script>
    window.__STATIC_MODE__ = true;
    window.__PAGE_DATA__ = ${safeJson};
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

  await fs.writeFile(path.join(outputDir, 'index.html'), html);
}

async function generateMarkdownFiles(
  pages: ScannedPage[],
  apiSpecs: ApiSpec[],
  outputDir: string,
): Promise<void> {
  for (const page of pages) {
    const mdPath = page.url === '/' ? '/index.md' : `${page.url}.md`;
    const outPath = path.join(outputDir, mdPath);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, page.rawContent);
  }

  if (!apiSpecs.length) return;
  const { flattenSchema, generateExampleJson } = await import('@/lib/schema');
  const { generateCurl } = await import('@/lib/snippet-generators');

  for (const spec of apiSpecs) {
    const specSlug = getSpecSlug(spec);
    const paths = spec.document.paths ?? {};
    for (const [pathStr, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const op = pathItem[method] as import('openapi-types').OpenAPIV3.OperationObject | undefined;
        if (!op) continue;
        const opId = op.operationId ?? `${method}_${pathStr.replace(/[/{}\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
        const mdPath = `/apis/${specSlug}/${encodeURIComponent(opId)}.md`;
        const outPath = path.join(outputDir, mdPath);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        const md = buildApiMd(method.toUpperCase(), pathStr, op, spec.server.url, spec.auth, flattenSchema, generateExampleJson, generateCurl);
        await fs.writeFile(outPath, md);
      }
    }
  }
}

function buildApiMd(
  method: string,
  apiPath: string,
  operation: import('openapi-types').OpenAPIV3.OperationObject,
  serverUrl: string,
  auth: { type: string; header: string; placeholder?: string } | undefined,
  flattenSchema: (s: any) => any[],
  generateExampleJson: (s: any) => any,
  generateCurl: (opts: any) => string,
): string {
  const lines: string[] = [];
  const params = (operation.parameters ?? []) as import('openapi-types').OpenAPIV3.ParameterObject[];

  lines.push(`# ${operation.summary ?? `${method} ${apiPath}`}`);
  lines.push('');
  if (operation.description) {
    lines.push(operation.description);
    lines.push('');
  }
  lines.push(`\`${method}\` \`${apiPath}\``);
  lines.push('');

  const headerParams = params.filter(p => p.in === 'header');
  const pathParams = params.filter(p => p.in === 'path');
  const queryParams = params.filter(p => p.in === 'query');

  if (auth || headerParams.length > 0) {
    lines.push('## Authorization');
    lines.push('');
    lines.push('| Header | Type | Required | Description |');
    lines.push('| --- | --- | --- | --- |');
    if (auth) lines.push(`| \`${auth.header}\` | string | Yes | ${auth.placeholder ?? 'API key'} |`);
    for (const p of headerParams) {
      const schema = (p.schema ?? {}) as any;
      lines.push(`| \`${p.name}\` | ${schema.type ?? 'string'} | ${p.required ? 'Yes' : 'No'} | ${p.description ?? ''} |`);
    }
    lines.push('');
  }

  if (pathParams.length > 0) {
    lines.push('## Path Parameters');
    lines.push('');
    lines.push('| Parameter | Type | Required | Description |');
    lines.push('| --- | --- | --- | --- |');
    for (const p of pathParams) {
      const schema = (p.schema ?? {}) as any;
      lines.push(`| \`${p.name}\` | ${schema.type ?? 'string'} | ${p.required ? 'Yes' : 'No'} | ${p.description ?? ''} |`);
    }
    lines.push('');
  }

  if (queryParams.length > 0) {
    lines.push('## Query Parameters');
    lines.push('');
    lines.push('| Parameter | Type | Required | Description |');
    lines.push('| --- | --- | --- | --- |');
    for (const p of queryParams) {
      const schema = (p.schema ?? {}) as any;
      lines.push(`| \`${p.name}\` | ${schema.type ?? 'string'} | ${p.required ? 'Yes' : 'No'} | ${p.description ?? ''} |`);
    }
    lines.push('');
  }

  const requestBody = operation.requestBody as import('openapi-types').OpenAPIV3.RequestBodyObject | undefined;
  if (requestBody?.content) {
    const contentType = Object.keys(requestBody.content)[0];
    const schema = contentType ? requestBody.content[contentType]?.schema : undefined;
    if (schema) {
      lines.push('## Request Body');
      lines.push('');
      lines.push(`Content-Type: \`${contentType}\``);
      lines.push('');
      const example = generateExampleJson(schema);
      lines.push('```json');
      lines.push(JSON.stringify(example, null, 2));
      lines.push('```');
      lines.push('');
    }
  }

  const responses = operation.responses as Record<string, import('openapi-types').OpenAPIV3.ResponseObject> | undefined;
  if (responses) {
    lines.push('## Responses');
    lines.push('');
    for (const [status, resp] of Object.entries(responses)) {
      lines.push(`### ${status}${resp.description ? ` — ${resp.description}` : ''}`);
      lines.push('');
      const content = resp.content ?? {};
      const contentType = Object.keys(content)[0];
      const schema = contentType ? content[contentType]?.schema : undefined;
      if (schema) {
        const example = generateExampleJson(schema);
        lines.push('```json');
        lines.push(JSON.stringify(example, null, 2));
        lines.push('```');
        lines.push('');
      }
    }
  }

  const headers: Record<string, string> = {};
  if (auth) headers[auth.header] = auth.placeholder ?? 'YOUR_API_KEY';
  lines.push('## cURL');
  lines.push('');
  lines.push('```bash');
  lines.push(generateCurl({ method, url: serverUrl + apiPath, headers }));
  lines.push('```');

  return lines.join('\n');
}

// --- Main export ---

export async function generateStaticSite(options: StaticGenerateOptions): Promise<void> {
  const { projectRoot, config, outputDir, packageRoot } = options;

  console.log(chalk.cyan('\nGenerating static site...'));

  // Scan all content from filesystem
  console.log(chalk.gray('  Scanning content...'));
  const pages = await scanAllContent(projectRoot, config, packageRoot);
  console.log(chalk.gray(`  Found ${pages.length} pages`));

  const contentMirror = path.resolve(packageRoot, '.content');
  const folderMeta = await scanFolderMeta(contentMirror, config);
  const tree = buildPageTree(pages, config, folderMeta);
  const navMap = computeNavigation(tree);

  // Generate all static assets
  console.log(chalk.gray('  Generating page data files...'));
  await generatePageDataFiles(pages, navMap, outputDir);

  console.log(chalk.gray('  Generating search index...'));
  await generateSearchIndex(pages, config, outputDir, projectRoot);

  console.log(chalk.gray('  Generating API specs...'));
  await generateApiSpecs(config, outputDir, projectRoot);

  const latestApiConfigs = config.api ?? [];
  const apiSpecsForMd = latestApiConfigs.length ? await loadSpecs(latestApiConfigs, projectRoot) : [];

  console.log(chalk.gray('  Generating markdown files...'));
  await generateMarkdownFiles(pages, apiSpecsForMd, outputDir);

  console.log(chalk.gray('  Generating sitemap.xml...'));
  await generateSitemap(pages, config, outputDir, projectRoot);

  console.log(chalk.gray('  Generating robots.txt...'));
  await generateRobotsTxt(config, outputDir);

  console.log(chalk.gray('  Generating llms.txt...'));
  await generateLlmsTxt(pages, config, outputDir);

  console.log(chalk.gray('  Generating OG images...'));
  await generateOgImages(pages, config, outputDir, packageRoot);

  console.log(chalk.gray('  Optimizing images...'));
  await optimizeImages(pages, packageRoot, outputDir);

  console.log(chalk.gray('  Copying public assets...'));
  await copyPublicAssets(projectRoot, outputDir);

  console.log(chalk.gray('  Generating SPA index.html...'));
  await generateSpaIndex(config, tree, outputDir);

  console.log(chalk.green(`  Static site generated: ${pages.length} pages`));
}
