import path from 'node:path'
import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Image, Html } from 'mdast'
import type { Element } from 'hast'
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxJsxAttribute } from 'mdast-util-mdx-jsx'
import { MdxNodeType } from './mdx-utils'
import { isLocalImage, isSvg, buildOptimizedUrl, DEFAULT_WIDTH } from './image-utils'
import { getAssetVersion } from './asset-version'

interface ImageParams {
  w?: number
  q?: number
}

function parseImageParams(src: string): { base: string; params: ImageParams } {
  const qIdx = src.indexOf('?')
  if (qIdx === -1) return { base: src, params: {} }
  const base = src.slice(0, qIdx)
  const search = new URLSearchParams(src.slice(qIdx + 1))
  const params: ImageParams = {}
  if (search.has('w')) params.w = Number.parseInt(search.get('w')!, 10)
  if (search.has('q')) params.q = Number.parseInt(search.get('q')!, 10)
  return { base, params }
}

function appendParams(url: string, params: ImageParams): string {
  if (!params.w && !params.q) return url
  const qs = new URLSearchParams()
  if (params.w) qs.set('w', String(params.w))
  if (params.q) qs.set('q', String(params.q))
  return `${url}?${qs}`
}

function resolveUrl(src: string, dir: string): string {
  const normalized = src.replace(/\\/g, '/')
  if (/^[a-z][a-z0-9+\-.]*:/i.test(normalized)) return normalized
  if (normalized.startsWith('//')) return normalized
  if (normalized.startsWith('#')) return normalized
  if (normalized.startsWith('/_content/')) return normalized

  if (normalized.startsWith('/')) return `/_content${normalized}`
  return `/_content/${path.posix.normalize(path.posix.join(dir, normalized))}`
}

interface RemarkResolveImagesOptions {
  optimize?: boolean
}

function finalizeUrl(url: string, optimize: boolean, version?: string): string {
  const { base, params } = parseImageParams(url)
  const width = params.w || DEFAULT_WIDTH
  const quality = params.q
  if (optimize && isLocalImage(base) && !isSvg(base)) return buildOptimizedUrl(base, width, quality, version)
  return version ? `${base}?v=${version}` : base
}

const IMG_SRC_PATTERN = /(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi

/**
 * Splits a page's path at its content root. The part below the split is also
 * its path under `/_content/`, which is what image URLs are built from —
 * `content/docs/` mirrors as `docs/`, `versions/v1/docs/` as `v1/docs/`.
 *
 * Takes the deepest marker, since a project can sit inside a directory named
 * `versions` and still keep its pages under `content/`.
 */
function splitContentRoot(
  filePath: string,
): { root: string; relative: string } | null {
  let end = -1
  for (const marker of ['/versions/', '/content/']) {
    const idx = filePath.lastIndexOf(marker)
    if (idx !== -1) end = Math.max(end, idx + marker.length)
  }
  if (end === -1) return null
  return { root: filePath.slice(0, end), relative: filePath.slice(end) }
}

const remarkResolveImages: Plugin<[RemarkResolveImagesOptions?]> = (options) => {
  const optimize = options?.optimize ?? true
  return async (tree, file) => {
    // `valueToExport` names `images`, so returning without it fails the build.
    file.data.images = []

    const filePath = file.path?.replace(/\\/g, '/')
    if (!filePath) return

    const split = splitContentRoot(filePath)
    if (!split) return

    const { root: contentRoot, relative } = split
    const dir = path.posix.dirname(relative)

    const seen = new Set<string>()
    const images: string[] = []

    function collect(src: string) {
      if (!src || seen.has(src) || /^data:/i.test(src)) return
      seen.add(src)
      images.push(src)
    }

    async function versionFor(resolved: string): Promise<string | undefined> {
      if (!isLocalImage(resolved)) return undefined
      let rel: string
      try {
        rel = decodeURIComponent(resolved.slice('/_content/'.length))
      } catch {
        return undefined
      }
      // Decoded backslashes (%5C) are separators on Windows — normalize so
      // posix.join collapses any `..` and the containment check below holds
      const diskPath = path.posix.join(contentRoot, rel.replace(/\\/g, '/'))
      if (!diskPath.startsWith(contentRoot)) return undefined
      return (await getAssetVersion(diskPath)) ?? undefined
    }

    async function processUrl(src: string): Promise<string> {
      const { base, params } = parseImageParams(src)
      const resolved = resolveUrl(base, dir)
      const version = await versionFor(resolved)
      collect(version ? `${resolved}?v=${version}` : resolved)
      return finalizeUrl(appendParams(resolved, params), optimize, version)
    }

    const imageNodes: Image[] = []
    const htmlNodes: Html[] = []
    const srcAttrs: MdxJsxAttribute[] = []
    const imgElements: Element[] = []

    visit(tree, 'image', (node: Image) => {
      if (node.url) imageNodes.push(node)
    })

    visit(tree, 'html', (node: Html) => {
      htmlNodes.push(node)
    })

    visit(tree, (node) => {
      if (node.type !== MdxNodeType.JsxFlow && node.type !== MdxNodeType.JsxText) return
      const jsx = node as MdxJsxFlowElement | MdxJsxTextElement
      if (jsx.name !== 'img') return
      const srcAttr = jsx.attributes.find((a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute' && a.name === 'src')
      if (srcAttr?.value && typeof srcAttr.value === 'string') srcAttrs.push(srcAttr)
    })

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return
      if (typeof node.properties?.src === 'string') imgElements.push(node)
    })

    for (const node of imageNodes) {
      node.url = await processUrl(node.url)
    }

    for (const node of htmlNodes) {
      let result = ''
      let last = 0
      for (const match of node.value.matchAll(IMG_SRC_PATTERN)) {
        const [full, before, src, after] = match
        result += node.value.slice(last, match.index) + before + (await processUrl(src)) + after
        last = match.index + full.length
      }
      node.value = result + node.value.slice(last)
    }

    for (const attr of srcAttrs) {
      attr.value = await processUrl(attr.value as string)
    }

    for (const node of imgElements) {
      node.properties.src = await processUrl(node.properties.src as string)
    }

    file.data.images = images
  }
}

export default remarkResolveImages
