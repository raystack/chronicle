import { describe, expect, test } from 'bun:test';
import type { Root } from 'mdast';
import { VFile } from 'vfile';
import remarkValidateMdxPlugin, { type RemarkValidateMdxOptions } from './remark-validate-mdx';

const remarkValidateMdx = remarkValidateMdxPlugin as unknown as (
  options?: RemarkValidateMdxOptions,
) => (tree: Root, file: VFile) => void;

const position = {
  start: { line: 3, column: 1, offset: 10 },
  end: { line: 3, column: 10, offset: 19 },
};

function jsxNode(name: string | null, type = 'mdxJsxFlowElement') {
  return { type, name, attributes: [], children: [], position } as unknown as Root['children'][number];
}

function importNode(localName: string) {
  return {
    type: 'mdxjsEsm',
    value: `import ${localName} from './x'`,
    data: {
      estree: {
        type: 'Program',
        body: [
          {
            type: 'ImportDeclaration',
            specifiers: [{ type: 'ImportDefaultSpecifier', local: { name: localName } }],
          },
        ],
      },
    },
  } as unknown as Root['children'][number];
}

function run(children: Root['children']) {
  const tree: Root = { type: 'root', children };
  const file = new VFile({ path: '/project/.content/docs/test.mdx' });
  remarkValidateMdx()(tree, file);
}

describe('remarkValidateMdx', () => {
  test('fails on unknown capitalized component', () => {
    expect(() => run([jsxNode('Foo')])).toThrow(/Unknown component <Foo>/);
  });

  test('reports position of the offending node', () => {
    try {
      run([jsxNode('Foo')]);
      throw new Error('expected failure');
    } catch (err) {
      expect((err as { line?: number }).line).toBe(3);
      expect((err as { column?: number }).column).toBe(1);
    }
  });

  test('allows registered components', () => {
    expect(() => run([jsxNode('Callout'), jsxNode('Mermaid')])).not.toThrow();
  });

  test('allows member expressions on registered components', () => {
    expect(() => run([jsxNode('Tabs.Tab'), jsxNode('Tabs.Content', 'mdxJsxTextElement')])).not.toThrow();
  });

  test('fails on member expressions with unknown root', () => {
    expect(() => run([jsxNode('Foo.Bar')])).toThrow(/Unknown component <Foo.Bar>/);
  });

  test('fails on unknown lowercase tag', () => {
    expect(() => run([jsxNode('foox')])).toThrow(/Unknown HTML tag <foox>/);
  });

  test('allows standard HTML and SVG tags', () => {
    expect(() => run([jsxNode('div'), jsxNode('details'), jsxNode('clipPath'), jsxNode('svg')])).not.toThrow();
  });

  test('allows custom elements with a dash', () => {
    expect(() => run([jsxNode('my-widget')])).not.toThrow();
  });

  test('allows fragments', () => {
    expect(() => run([jsxNode(null)])).not.toThrow();
  });

  test('allows components imported within the MDX file', () => {
    expect(() => run([importNode('Chart'), jsxNode('Chart')])).not.toThrow();
  });

  test('respects custom components option', () => {
    const tree: Root = { type: 'root', children: [jsxNode('Special')] };
    const file = new VFile({ path: '/t.mdx' });
    expect(() => remarkValidateMdx({ components: ['Special'] })(tree, file)).not.toThrow();
  });
});
