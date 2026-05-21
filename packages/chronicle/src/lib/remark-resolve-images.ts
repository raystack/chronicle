import path from 'node:path'
import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Image, Html } from 'mdast'
import type { Element } from 'hast'
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxJsxAttribute } from 'mdast-util-mdx-jsx'
import { MdxNodeType } from './mdx-utils'
import { isLocalImage, isSvg, buildOptimizedUrl, DEFAULT_WIDTH } from './image-utils'

function resolveUrl(src: string, dir: string): string {
  if (/^[a-z][a-z0-9+\-.]*:/i.test(src)) return src
  if (src.startsWith('//')) return src
  if (src.startsWith('#')) return src
  if (src.startsWith('/_content/')) return src

  if (src.startsWith('/')) return `/_content${src}`
  return `/_content/${path.posix.normalize(path.posix.join(dir, src))}`
}

function optimizeUrl(url: string): string {
  if (isLocalImage(url) && !isSvg(url)) return buildOptimizedUrl(url, DEFAULT_WIDTH)
  return url
}

const remarkResolveImages: Plugin = () => {
  return (tree, file) => {
    const filePath = file.path
    if (!filePath) return

    const contentIdx = filePath.lastIndexOf('/content/')
    if (contentIdx === -1) return

    const relative = filePath.slice(contentIdx + '/content/'.length)
    const dir = path.posix.dirname(relative)

    const seen = new Set<string>()
    const images: string[] = []

    function collect(src: string) {
      if (!src || seen.has(src) || /^data:/i.test(src)) return
      seen.add(src)
      images.push(src)
    }

    visit(tree, 'image', (node: Image) => {
      if (!node.url) return
      node.url = resolveUrl(node.url, dir)
      collect(node.url)
      node.url = optimizeUrl(node.url)
    })

    visit(tree, 'html', (node: Html) => {
      node.value = node.value.replace(
        /(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi,
        (_, before, src, after) => {
          const resolved = resolveUrl(src, dir)
          collect(resolved)
          return `${before}${optimizeUrl(resolved)}${after}`
        }
      )
    })

    visit(tree, (node) => {
      if (node.type !== MdxNodeType.JsxFlow && node.type !== MdxNodeType.JsxText) return
      const jsx = node as MdxJsxFlowElement | MdxJsxTextElement
      if (jsx.name !== 'img') return
      const srcAttr = jsx.attributes.find((a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute' && a.name === 'src')
      if (!srcAttr?.value || typeof srcAttr.value !== 'string') return
      srcAttr.value = resolveUrl(srcAttr.value, dir)
      collect(srcAttr.value)
      srcAttr.value = optimizeUrl(srcAttr.value)
    })

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return
      const src = node.properties?.src
      if (typeof src !== 'string') return
      node.properties.src = resolveUrl(src, dir)
      collect(node.properties.src as string)
      node.properties.src = optimizeUrl(node.properties.src as string)
    })

    file.data.images = images
  }
}

export default remarkResolveImages
