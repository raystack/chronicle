import { describe, expect, test } from 'bun:test';
import type { Root, RootContent } from 'hast';
import rehypeTocText from './rehype-toc-text';

type EstreeNode = {
  type: string
  name?: string
  value?: EstreeNode | string | number
  key?: EstreeNode
  properties?: EstreeNode[]
  elements?: EstreeNode[]
  declarations?: Array<{ init?: EstreeNode }>
  declaration?: EstreeNode
  body?: EstreeNode[]
}

interface TocItem {
  depth: number
  url: string
  title: string
}

function heading(tagName: string, id: string, children: RootContent[]): RootContent {
  return { type: 'element', tagName, properties: { id }, children } as RootContent
}

const text = (value: string): RootContent => ({ type: 'text', value })

/** An MDX component in a heading, as rehype sees it after the MDX parser. */
const jsx = (name: string, children: RootContent[]): RootContent =>
  ({ type: 'mdxJsxTextElement', name, attributes: [], children }) as unknown as RootContent

/** Runs the plugin and reads the exported `toc` back out of the estree it appends. */
function runPlugin(children: RootContent[]): { toc: TocItem[]; tree: Root } {
  const tree: Root = { type: 'root', children }
  const transform = rehypeTocText.call({ use: () => undefined } as never) as (t: Root) => void
  transform(tree)

  const exported = tree.children[tree.children.length - 1] as { data?: { estree?: EstreeNode } }
  const program = exported.data?.estree
  const array = program?.body?.[0]?.declaration?.declarations?.[0]?.init
  const toc = (array?.elements ?? []).map(element => {
    const item: Record<string, unknown> = {}
    for (const property of element.properties ?? []) {
      const literal = property.value as EstreeNode | undefined
      item[property.key?.name as string] = literal?.value
    }
    return item as unknown as TocItem
  })
  return { toc, tree }
}

/** An ESM export node shaped like the ones MDX plugins append. */
function esmExport(statements: unknown[]): RootContent {
  return {
    type: 'mdxjsEsm',
    value: '',
    data: { estree: { type: 'Program', sourceType: 'module', body: statements } },
  } as unknown as RootContent
}

function namedExport(...names: string[]): unknown {
  return {
    type: 'ExportNamedDeclaration',
    specifiers: [],
    declaration: {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: names.map(name => ({ type: 'VariableDeclarator', id: { type: 'Identifier', name } })),
    },
  }
}

/** Reads the binding names an ESM node still exports. */
function exportedNames(node: RootContent): string[] {
  const body = (node as unknown as { data?: { estree?: { body?: unknown[] } } }).data?.estree?.body ?? []
  return body.flatMap(statement => {
    const s = statement as {
      specifiers?: Array<{ exported?: { name?: string } }>
      declaration?: { declarations?: Array<{ id?: { name?: string } }> } | null
    }
    return [
      ...(s.declaration?.declarations ?? []).map(d => d.id?.name ?? ''),
      ...(s.specifiers ?? []).map(spec => spec.exported?.name ?? ''),
    ]
  })
}

describe('rehypeTocText', () => {
  test('exports headings as plain-text titles', () => {
    const { toc } = runPlugin([heading('h2', 'hello-world', [text('Hello world')])])
    expect(toc).toEqual([{ depth: 2, url: '#hello-world', title: 'Hello world' }])
  })

  test('flattens components in a heading to their text', () => {
    const { toc } = runPlugin([
      heading('h3', 'rate-limits', [text('Rate limits '), jsx('Badge', [text('Beta')])]),
    ])
    expect(toc).toEqual([{ depth: 3, url: '#rate-limits', title: 'Rate limits Beta' }])
  })

  test('flattens inline markup in a heading', () => {
    const { toc } = runPlugin([
      heading('h2', 'the-id-field', [
        text('The '),
        { type: 'element', tagName: 'code', properties: {}, children: [text('id')] } as RootContent,
        text(' field'),
      ]),
    ])
    expect(toc).toEqual([{ depth: 2, url: '#the-id-field', title: 'The id field' }])
  })

  test('omits headings tagged [!toc] and strips the tag from the page', () => {
    const { toc, tree } = runPlugin([heading('h2', 'hidden', [text('Hidden [!toc]')])])
    expect(toc).toEqual([])
    const rendered = tree.children[0] as { children: Array<{ value: string }> }
    expect(rendered.children[0].value).toBe('Hidden')
  })

  test('keeps [toc]-only headings in the toc but drops them from the page', () => {
    const { toc, tree } = runPlugin([heading('h2', 'toc-only', [text('Toc only [toc]')])])
    expect(toc).toEqual([{ depth: 2, url: '#toc-only', title: 'Toc only' }])
    expect(tree.children).toHaveLength(1) // only the toc export is left
  })

  test('skips headings without an id', () => {
    const { toc } = runPlugin([
      { type: 'element', tagName: 'h2', properties: {}, children: [text('No id')] } as RootContent,
    ])
    expect(toc).toEqual([])
  })

  test('replaces a toc already exported upstream', () => {
    const { toc, tree } = runPlugin([heading('h2', 'hello', [text('Hello')]), esmExport([namedExport('toc')])])
    expect(toc).toEqual([{ depth: 2, url: '#hello', title: 'Hello' }])
    expect(tree.children.filter(child => (child as { type: string }).type === 'mdxjsEsm')).toHaveLength(1)
  })

  test('leaves other ESM exports alone', () => {
    const { tree } = runPlugin([heading('h2', 'hello', [text('Hello')]), esmExport([namedExport('readingTime')])])
    expect(tree.children.filter(child => (child as { type: string }).type === 'mdxjsEsm')).toHaveLength(2)
  })

  test('keeps bindings declared alongside an upstream toc', () => {
    const { tree } = runPlugin([
      heading('h2', 'hello', [text('Hello')]),
      esmExport([namedExport('toc', 'structuredData')]),
    ])
    const esm = tree.children.filter(child => (child as { type: string }).type === 'mdxjsEsm')
    expect(esm).toHaveLength(2)
    expect(exportedNames(esm[0])).toEqual(['structuredData'])
    expect(exportedNames(esm[1])).toEqual(['toc'])
  })

  test('removes a toc exported under an alias', () => {
    const aliased = esmExport([
      {
        type: 'ExportNamedDeclaration',
        declaration: null,
        specifiers: [
          { type: 'ExportSpecifier', local: { name: 'upstreamToc' }, exported: { name: 'toc' } },
          { type: 'ExportSpecifier', local: { name: 'images' }, exported: { name: 'images' } },
        ],
      },
    ])
    const { tree } = runPlugin([heading('h2', 'hello', [text('Hello')]), aliased])
    const esm = tree.children.filter(child => (child as { type: string }).type === 'mdxjsEsm')
    expect(esm).toHaveLength(2)
    expect(exportedNames(esm[0])).toEqual(['images'])
  })

  test('still collects the heading after a [toc]-only heading', () => {
    const { toc, tree } = runPlugin([
      heading('h2', 'toc-only', [text('Toc only [toc]')]),
      heading('h2', 'next', [text('Next')]),
    ])
    expect(toc).toEqual([
      { depth: 2, url: '#toc-only', title: 'Toc only' },
      { depth: 2, url: '#next', title: 'Next' },
    ])
    expect(tree.children.filter(child => (child as { type: string }).type === 'element')).toHaveLength(1)
  })

  test('exports an empty toc when there are no headings', () => {
    expect(runPlugin([{ type: 'element', tagName: 'p', properties: {}, children: [text('Body')] } as RootContent]).toc).toEqual([])
  })
})
