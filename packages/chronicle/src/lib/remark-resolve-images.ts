import path from 'node:path'
import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Image, Html } from 'mdast'
import type { Element } from 'hast'
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxJsxAttribute } from 'mdast-util-mdx-jsx'
import { MdxNodeType } from './mdx-utils'

function resolveUrl(src: string, dir: string): string {
  if (/^[a-z][a-z0-9+\-.]*:/i.test(src)) return src
  if (src.startsWith('//')) return src
  if (src.startsWith('#')) return src
  if (src.startsWith('/_content/')) return src

  if (src.startsWith('/')) return `/_content${src}`
  return `/_content/${path.posix.normalize(path.posix.join(dir, src))}`
}

const remarkResolveImages: Plugin = () => {
  return (tree, file) => {
    const filePath = file.path
    if (!filePath) return

    const contentIdx = filePath.lastIndexOf('/content/')
    if (contentIdx === -1) return

    const relative = filePath.slice(contentIdx + '/content/'.length)
    const dir = path.posix.dirname(relative)

    visit(tree, 'image', (node: Image) => {
      if (!node.url) return
      node.url = resolveUrl(node.url, dir)
    })

    visit(tree, 'html', (node: Html) => {
      node.value = node.value.replace(
        /(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi,
        (_, before, src, after) => `${before}${resolveUrl(src, dir)}${after}`
      )
    })

    visit(tree, (node) => {
      if (node.type !== MdxNodeType.JsxFlow && node.type !== MdxNodeType.JsxText) return
      const jsx = node as MdxJsxFlowElement | MdxJsxTextElement
      if (jsx.name !== 'img') return
      const srcAttr = jsx.attributes.find((a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute' && a.name === 'src')
      if (!srcAttr?.value || typeof srcAttr.value !== 'string') return
      srcAttr.value = resolveUrl(srcAttr.value, dir)
    })

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return
      const src = node.properties?.src
      if (typeof src !== 'string') return
      node.properties.src = resolveUrl(src, dir)
    })
  }
}

export default remarkResolveImages
