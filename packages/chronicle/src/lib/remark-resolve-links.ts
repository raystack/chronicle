import path from 'node:path'
import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Link } from 'mdast'

const remarkResolveLinks: Plugin = () => {
  return (tree, file) => {
    const filePath = file.path
    if (!filePath) return

    const contentIdx = filePath.indexOf('/content/')
    if (contentIdx === -1) return

    const relative = filePath.slice(contentIdx + '/content/'.length)
    const dir = path.posix.dirname(relative)

    visit(tree, 'link', (node: Link) => {
      if (!node.url) return
      if (node.url.startsWith('http://') || node.url.startsWith('https://')) return
      if (node.url.startsWith('#')) return
      if (node.url.startsWith('/')) return

      const [rawPath, hash] = node.url.split('#')
      const stripped = rawPath.replace(/\.mdx?$/, '')
      let resolved = path.posix.normalize(path.posix.join(dir, stripped))
      resolved = resolved.replace(/\/(index|readme)$/i, '') || '.'
      node.url = `/${resolved}${hash ? `#${hash}` : ''}`
    })
  }
}

export default remarkResolveLinks
