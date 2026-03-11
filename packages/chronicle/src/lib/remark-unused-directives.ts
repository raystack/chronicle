import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Node } from 'unist'

interface DirectiveNode extends Node {
  name?: string
  attributes?: Record<string, string>
  children?: Node[]
  data?: unknown
  [key: string]: unknown
}

const remarkUnusedDirectives: Plugin = () => {
  return (tree) => {
    visit(tree, ['textDirective'], (node: DirectiveNode) => {
      if (!node.data) {
        const hasAttributes = node.attributes && Object.keys(node.attributes).length > 0
        const hasChildren = node.children && node.children.length > 0
        if (!hasAttributes && !hasChildren) {
          const name = node.name
          if (!name) return
          Object.keys(node).forEach((key) => delete node[key])
          node.type = 'text'
          node.value = `:${name}`
        }
      }
    })
  }
}

export default remarkUnusedDirectives
