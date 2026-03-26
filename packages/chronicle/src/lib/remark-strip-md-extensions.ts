import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'

const remarkStripMdExtensions: Plugin = () => {
  return (tree) => {
    visit(tree, 'link', (node: any) => {
      if (!node.url) return
      if (node.url.startsWith('http://') || node.url.startsWith('https://')) return
      node.url = node.url.replace(/\.mdx?(#|$)/, '$1')
    })
  }
}

export default remarkStripMdExtensions
