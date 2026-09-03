import type { Folder, Node, Root } from 'fumadocs-core/page-tree'
import type { ChronicleConfig } from '@/types'
import { getLatestContentRoots, getVersionContentRoots } from './config'

export interface VersionContext {
  dir: string | null
  urlPrefix: string
}

export const LATEST_CONTEXT: VersionContext = { dir: null, urlPrefix: '' }

export function resolveVersionFromUrl(
  url: string,
  config: ChronicleConfig,
): VersionContext {
  for (const v of config.versions ?? []) {
    const prefix = `/${v.dir}`
    if (url === prefix || url.startsWith(`${prefix}/`)) {
      return { dir: v.dir, urlPrefix: prefix }
    }
  }
  return LATEST_CONTEXT
}

function versionPrefixes(config: ChronicleConfig): string[] {
  return (config.versions ?? []).map((v) => `/${v.dir}`)
}

function isUnderPrefix(url: string, prefix: string): boolean {
  return url === prefix || url.startsWith(`${prefix}/`)
}

export function filterPagesByVersion<T extends { url: string }>(
  pages: T[],
  ctx: VersionContext,
  config: ChronicleConfig,
): T[] {
  if (ctx.dir !== null) {
    return pages.filter((p) => isUnderPrefix(p.url, ctx.urlPrefix))
  }
  const prefixes = versionPrefixes(config)
  return pages.filter((p) => !prefixes.some((pre) => isUnderPrefix(p.url, pre)))
}

function nodeUrls(node: Node): string[] {
  if (node.type === 'page') return [node.url]
  if (node.type === 'folder') {
    const urls: string[] = []
    if (node.index) urls.push(node.index.url)
    for (const child of node.children) urls.push(...nodeUrls(child))
    return urls
  }
  return []
}

function nodeMatchesVersion(
  node: Node,
  ctx: VersionContext,
  config: ChronicleConfig,
): boolean {
  const urls = nodeUrls(node)
  if (urls.length === 0) return ctx.dir === null
  if (ctx.dir !== null) {
    return urls.every((u) => isUnderPrefix(u, ctx.urlPrefix))
  }
  const prefixes = versionPrefixes(config)
  return urls.every((u) => !prefixes.some((pre) => isUnderPrefix(u, pre)))
}

/**
 * True when `tree` has already been narrowed to `prefix`. Both filters run
 * twice on the same tree — `entry-server` before serialising, then a layout —
 * so both have to be safe to repeat.
 */
function isAlreadyScoped(tree: Root, prefix: string): boolean {
  const urls = tree.children.flatMap(nodeUrls)
  return urls.length > 0 && urls.every((u) => isUnderPrefix(u, prefix))
}

export function filterPageTreeByVersion(
  tree: Root,
  ctx: VersionContext,
  config: ChronicleConfig,
): Root {
  if (ctx.dir !== null) {
    if (isAlreadyScoped(tree, ctx.urlPrefix)) return tree
    const versionFolder = tree.children.find(
      (n): n is Folder =>
        n.type === 'folder' && nodeMatchesVersion(n, ctx, config),
    )
    return { ...tree, children: versionFolder ? versionFolder.children : [] }
  }
  return {
    ...tree,
    children: tree.children.filter((n) => nodeMatchesVersion(n, ctx, config)),
  }
}

export function filterPageTreeByContentDir(
  tree: Root,
  ctx: VersionContext,
  contentDir: string | null,
): Root {
  if (contentDir === null) return tree
  const expectedPrefix = `${ctx.urlPrefix}/${contentDir}`

  // `root` marks a content directory — `buildFiles` sets it on every one. A
  // sub-folder never carries it, which is what url shapes alone cannot tell us.
  const match = tree.children.find((n): n is Folder => {
    if (n.type !== 'folder' || n.root !== true) return false
    const urls = nodeUrls(n)
    return urls.length > 0 && urls.every((u) => isUnderPrefix(u, expectedPrefix))
  })
  if (match) return { ...tree, children: match.children }

  if (isAlreadyScoped(tree, expectedPrefix)) return tree
  return { ...tree, children: [] }
}


/**
 * Every content section's URL prefix — `/docs`, `/dev`, `/v1/docs` — longest
 * first, so `/v1/docs` is tested before `/v1` could ever shadow it.
 */
export function contentSectionPrefixes(config: ChronicleConfig): string[] {
  const prefixes = [
    ...getLatestContentRoots(config).map((r) => r.urlPrefix),
    ...(config.versions ?? []).flatMap((v) =>
      getVersionContentRoots(config, v.dir).map((r) => r.urlPrefix),
    ),
  ]
  return prefixes.sort((a, b) => b.length - a.length)
}

/** The section a page belongs to, or null if it sits outside every one. */
export function sectionOf(url: string, prefixes: string[]): string | null {
  return prefixes.find((p) => isUnderPrefix(url, p)) ?? null
}
