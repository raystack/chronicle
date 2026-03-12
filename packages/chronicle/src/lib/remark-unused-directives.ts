import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Node } from 'unist'

const remarkUnusedDirectives: Plugin = () => {
  return (tree) => {
    visit(tree, ['textDirective'], (node) => {
      const directive = node as Node & {
        name?: string
        attributes?: Record<string, string>
        children?: Node[]
        value?: string
        [key: string]: unknown
      }
      if (!directive.data) {
        const hasAttributes = directive.attributes && Object.keys(directive.attributes).length > 0
        const hasChildren = directive.children && directive.children.length > 0
        if (!hasAttributes && !hasChildren) {
          const name = directive.name
          if (!name) return
          Object.keys(directive).forEach((key) => delete directive[key])
          directive.type = 'text'
          directive.value = `:${name}`
        }
      }
    })
  }
}

export default remarkUnusedDirectives
