import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Node, Parent } from 'unist'

type DirectiveType = 'textDirective' | 'leafDirective' | 'containerDirective'

interface Directive extends Node {
  type: DirectiveType
  name: string
  attributes?: Record<string, string>
  children: Node[]
  data?: unknown
}

const directiveTypes: DirectiveType[] = [
  'textDirective',
  'leafDirective',
  'containerDirective',
]

function transformNode(node: Node, newNode: Node) {
  Object.keys(node).forEach((key) => {
    delete (node as Record<string, unknown>)[key]
  })
  Object.keys(newNode).forEach((key) => {
    ;(node as Record<string, unknown>)[key] = (newNode as Record<string, unknown>)[key]
  })
}

function isSimpleTextDirective(directive: Directive): boolean {
  if (directive.type !== 'textDirective') return false
  const hasAttributes = directive.attributes && Object.keys(directive.attributes).length > 0
  const hasChildren = directive.children.length > 0
  return !hasAttributes && !hasChildren
}

const remarkUnusedDirectives: Plugin = () => {
  return (tree) => {
    visit(tree as Parent, directiveTypes, (node) => {
      const directive = node as unknown as Directive
      if (!directive.data) {
        if (isSimpleTextDirective(directive)) {
          transformNode(directive, { type: 'text', value: `:${directive.name}` } as Node)
        }
      }
    })
  }
}

export default remarkUnusedDirectives
