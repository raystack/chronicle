import type { Element, Root, RootContent } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

const TOC_ONLY_TAG = '[toc]'
const NO_TOC_TAG = '[!toc]'
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

interface TocItem {
  title: string
  url: string
  depth: number
}

/** Strips `tag` from `value`, or returns false when it isn't present. */
function handleTag(value: string, tag: string): string | false {
  const idx = value.indexOf(tag)
  if (idx === -1) return false
  return value.slice(0, idx).trimEnd() + value.slice(idx + tag.length)
}

/** Concatenates every text descendant, including those inside MDX JSX elements. */
function toText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { children?: unknown[]; value?: unknown }
  if (Array.isArray(n.children)) return n.children.map(toText).join('')
  return typeof n.value === 'string' ? n.value : ''
}

/** `export const toc = <items>` as an MDX ESM node. */
function tocExportNode(items: TocItem[]): RootContent {
  return {
    type: 'mdxjsEsm',
    value: '',
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ExportNamedDeclaration',
            attributes: [],
            specifiers: [],
            declaration: {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: [
                {
                  type: 'VariableDeclarator',
                  id: { type: 'Identifier', name: 'toc' },
                  init: {
                    type: 'ArrayExpression',
                    elements: items.map(item => ({
                      type: 'ObjectExpression',
                      properties: (['depth', 'url', 'title'] as const).map(key => ({
                        type: 'Property',
                        method: false,
                        shorthand: false,
                        computed: false,
                        kind: 'init',
                        key: { type: 'Identifier', name: key },
                        value: { type: 'Literal', value: item[key] },
                      })),
                    })),
                  },
                },
              ],
            },
          },
        ],
      },
    },
  } as unknown as RootContent
}

/**
 * Replaces fumadocs' `rehypeToc`, which exports each heading as JSX evaluated at
 * module scope — a component in a heading (`### Limits <Badge>Beta</Badge>`) then
 * throws `Badge is not defined` at build time, because MDX components are only in
 * scope while rendering. Titles are exported as plain strings instead; both themes
 * already flatten them to text (`themes/default/Toc.tsx`, `themes/paper/ReadingProgress.tsx`).
 *
 * Keeps fumadocs' heading tags: `[!toc]` omits a heading from the toc, `[toc]`
 * lists it in the toc only and drops it from the page.
 */
const rehypeTocText: Plugin<[], Root> = () => {
  return tree => {
    const items: TocItem[] = []

    visit(tree, 'element', (element: Element, idx, parent) => {
      if (!HEADING_TAGS.has(element.tagName) || element.children.length === 0) return
      const id = element.properties.id
      if (typeof id !== 'string') return 'skip'

      let isTocOnly = false
      const last = element.children[element.children.length - 1]
      if (last?.type === 'text') {
        const noToc = handleTag(last.value, NO_TOC_TAG)
        if (noToc !== false) {
          last.value = noToc
          return 'skip'
        }
        const tocOnly = handleTag(last.value, TOC_ONLY_TAG)
        if (tocOnly !== false) {
          isTocOnly = true
          last.value = tocOnly
        }
      }

      items.push({
        title: toText(element).trim(),
        url: `#${id}`,
        depth: Number(element.tagName[1]),
      })

      if (isTocOnly && parent && typeof idx === 'number') parent.children.splice(idx, 1)
      return 'skip'
    })

    tree.children.push(tocExportNode(items))
  }
}

export default rehypeTocText
