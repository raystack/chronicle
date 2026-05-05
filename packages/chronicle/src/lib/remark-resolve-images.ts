import path from 'node:path'
import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Image } from 'mdast'

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
      if (/^[a-z][a-z0-9+\-.]*:/i.test(node.url)) return
      if (node.url.startsWith('/_content/')) return

      if (node.url.startsWith('/')) {
        node.url = `/_content${node.url}`
      } else {
        node.url = `/_content/${path.posix.normalize(path.posix.join(dir, node.url))}`
      }
    })

    visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node: any) => {
      if (node.name !== 'img') return
      const srcAttr = node.attributes?.find((a: any) => a.name === 'src')
      if (!srcAttr?.value || typeof srcAttr.value !== 'string') return
      if (/^[a-z][a-z0-9+\-.]*:/i.test(srcAttr.value)) return
      if (srcAttr.value.startsWith('/_content/')) return

      if (srcAttr.value.startsWith('/')) {
        srcAttr.value = `/_content${srcAttr.value}`
      } else {
        srcAttr.value = `/_content/${path.posix.normalize(path.posix.join(dir, srcAttr.value))}`
      }
    })
  }
}

export default remarkResolveImages
