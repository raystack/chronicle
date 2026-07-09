import type { Root } from 'mdast'
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx'
import type { Plugin } from 'unified'
import type { Node } from 'unist'
import { visit } from 'unist-util-visit'
import type { VFile } from 'vfile'
import { KNOWN_TAGS, MDX_COMPONENT_NAMES } from './mdx-component-names'
import { MdxNodeType } from './mdx-utils'

export interface RemarkValidateMdxOptions {
  /** Custom component names allowed in MDX content. Defaults to MDX_COMPONENT_NAMES. */
  components?: readonly string[]
}

interface EstreeNode {
  type: string
  specifiers?: Array<{ local?: { name?: string } }>
  declaration?: EstreeNode | null
  declarations?: Array<{ id?: { name?: string } }>
  id?: { name?: string }
  body?: EstreeNode[]
}

/** Names declared by import/export statements inside the MDX file itself. */
function collectLocalNames(tree: Root): Set<string> {
  const names = new Set<string>()
  visit(tree, 'mdxjsEsm', (node: Node) => {
    const program = (node as Node & { data?: { estree?: EstreeNode } }).data?.estree
    for (const stmt of program?.body ?? []) {
      if (stmt.type === 'ImportDeclaration') {
        for (const spec of stmt.specifiers ?? []) {
          if (spec.local?.name) names.add(spec.local.name)
        }
      }
      const decl = stmt.type === 'ExportNamedDeclaration' ? stmt.declaration : stmt
      if (!decl) continue
      if (decl.type === 'VariableDeclaration') {
        for (const d of decl.declarations ?? []) {
          if (d.id?.name) names.add(d.id.name)
        }
      } else if ((decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') && decl.id?.name) {
        names.add(decl.id.name)
      }
    }
  })
  return names
}

/**
 * Fails compilation with a precise message (file, line, column) when MDX
 * content uses a component that is neither a standard HTML/SVG element,
 * a registered Chronicle component, nor imported/defined in the file.
 * Unclosed or mismatched tags are already rejected earlier by the MDX parser.
 */
const remarkValidateMdx: Plugin<[RemarkValidateMdxOptions?], Root> = (options = {}) => {
  const allowed = new Set<string>(options.components ?? MDX_COMPONENT_NAMES)

  return (tree, file: VFile) => {
    const locals = collectLocalNames(tree)

    visit(tree, [MdxNodeType.JsxFlow, MdxNodeType.JsxText], (node) => {
      const { name, position } = node as MdxJsxFlowElement | MdxJsxTextElement
      if (!name) return // fragment <>...</>

      const root = name.split('.')[0]
      if (root.includes('-')) return // custom elements like <my-widget>
      if (locals.has(root)) return

      if (/^[a-z]/.test(root)) {
        if (KNOWN_TAGS.has(root)) return
        file.fail(
          `Unknown HTML tag <${name}> — not a standard HTML/SVG element. If it is a custom component, register it in Chronicle's MDX components.`,
          position,
        )
      } else if (!allowed.has(root)) {
        file.fail(
          `Unknown component <${name}> — available components: ${[...allowed].join(', ')}. Import it in this file or register it in Chronicle's MDX components.`,
          position,
        )
      }
    })
  }
}

export default remarkValidateMdx
