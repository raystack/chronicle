import { describe, expect, test } from 'bun:test';
import { buildCodeFrame, parseMdxError } from './mdx-error';

describe('parseMdxError', () => {
  test('parses VFileMessage shape (parse errors, file.fail)', () => {
    const info = parseMdxError({
      reason: 'Unknown component <Foo> — available components: Callout',
      line: 12,
      column: 3,
      file: '/project/.content/docs/setup.mdx',
      message: 'ignored',
    });
    expect(info).toEqual({
      message: 'Unknown component <Foo> — available components: Callout',
      file: '/project/.content/docs/setup.mdx',
      line: 12,
      column: 3,
    });
  });

  test('parses Rollup/Vite transform error shape', () => {
    const info = parseMdxError({
      message: 'Expected a closing tag for `<Callout>` (2:1-2:10)',
      loc: { file: '/p/.content/docs/a.mdx', line: 2, column: 1 },
    });
    expect(info?.file).toBe('/p/.content/docs/a.mdx');
    expect(info?.line).toBe(2);
    expect(info?.column).toBe(1);
  });

  test('falls back to id + message-embedded position', () => {
    const info = parseMdxError({
      message: 'Unexpected closing tag `</div>`, expected corresponding opening tag (5:1-5:7)',
      id: '/p/.content/docs/b.mdx',
    });
    expect(info?.file).toBe('/p/.content/docs/b.mdx');
    expect(info?.line).toBe(5);
    expect(info?.column).toBe(1);
  });

  test('strips vite query suffix from module ids', () => {
    const info = parseMdxError({
      message: 'boom at (1:1)',
      id: '/p/.content/docs/c.mdx?collection=default',
    });
    expect(info?.file).toBe('/p/.content/docs/c.mdx');
  });

  test('detects MDX runtime missing-component errors', () => {
    const info = parseMdxError(new Error('Expected component `Foo` to be defined: you likely forgot to import, pass, or provide it.'));
    expect(info?.message).toContain('Unknown component <Foo>');
  });

  test('returns null for unrelated errors', () => {
    expect(parseMdxError(new Error('connect ECONNREFUSED'))).toBeNull();
    expect(parseMdxError({ message: 'fail', id: '/p/src/app.tsx' })).toBeNull();
    expect(parseMdxError(null)).toBeNull();
    expect(parseMdxError('string error')).toBeNull();
  });
});

describe('buildCodeFrame', () => {
  const source = 'one\ntwo\nthree\nfour\nfive\nsix';

  test('includes context lines around the target', () => {
    const frame = buildCodeFrame(source, 3, 2);
    expect(frame.lines.map(l => l.number)).toEqual([1, 2, 3, 4, 5]);
    expect(frame.lines.find(l => l.target)?.text).toBe('three');
    expect(frame.caretColumn).toBe(2);
  });

  test('clamps at file boundaries', () => {
    const first = buildCodeFrame(source, 1);
    expect(first.lines.map(l => l.number)).toEqual([1, 2, 3]);
    const last = buildCodeFrame(source, 6);
    expect(last.lines.map(l => l.number)).toEqual([4, 5, 6]);
  });
});
