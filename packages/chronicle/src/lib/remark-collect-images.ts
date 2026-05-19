import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Image, Html } from 'mdast'
import type { Element } from 'hast'
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxJsxAttribute } from 'mdast-util-mdx-jsx'
import { MdxNodeType } from './mdx-utils'

const remarkCollectImages: Plugin = () => {
  return (tree, file) => {
    const images: string[] = []
    const seen = new Set<string>()

    function add(src: string) {
      if (!src || seen.has(src)) return
      if (/^data:/i.test(src)) return
      seen.add(src)
      images.push(src)
    }

    visit(tree, 'image', (node: Image) => {
      add(node.url)
    })

    visit(tree, 'html', (node: Html) => {
      const re = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi
      let match: RegExpExecArray | null
      while ((match = re.exec(node.value))) {
        add(match[1])
      }
    })

    visit(tree, (node) => {
      if (node.type !== MdxNodeType.JsxFlow && node.type !== MdxNodeType.JsxText) return
      const jsx = node as MdxJsxFlowElement | MdxJsxTextElement
      if (jsx.name !== 'img') return
      const srcAttr = jsx.attributes.find(
        (a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute' && a.name === 'src'
      )
      if (srcAttr?.value && typeof srcAttr.value === 'string') {
        add(srcAttr.value)
      }
    })

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return
      const src = node.properties?.src
      if (typeof src === 'string') add(src)
    })

    file.data.images = images
  }
}

export default remarkCollectImages
