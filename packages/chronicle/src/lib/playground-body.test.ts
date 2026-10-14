import { describe, expect, test } from 'bun:test';
import { arrayItemKind, coerceValue, initBodyValues, pruneBody } from './playground-body';
import { flattenSchema, type SchemaField } from './schema';

function field(partial: Partial<SchemaField> & Pick<SchemaField, 'name' | 'kind'>): SchemaField {
  return { type: partial.kind, required: false, ...partial };
}

describe('coerceValue', () => {
  test('converts boolean text to a boolean', () => {
    expect(coerceValue('boolean', 'true')).toBe(true);
    expect(coerceValue('boolean', 'false')).toBe(false);
  });

  test('converts number text to a number', () => {
    expect(coerceValue('number', '1.5')).toBe(1.5);
    expect(coerceValue('number', '-3')).toBe(-3);
    expect(coerceValue('number', '0')).toBe(0);
  });

  test('converts integer text to an integer', () => {
    expect(coerceValue('integer', '42')).toBe(42);
    expect(coerceValue('integer', '0')).toBe(0);
  });

  test('keeps the raw text when the value is not a valid number', () => {
    expect(coerceValue('number', 'abc')).toBe('abc');
    expect(coerceValue('integer', '1.5')).toBe('1.5');
  });

  test('keeps empty number text as empty', () => {
    expect(coerceValue('number', '')).toBe('');
    expect(coerceValue('integer', '  ')).toBe('');
  });

  test('keeps strings as strings', () => {
    expect(coerceValue('string', 'true')).toBe('true');
    expect(coerceValue('string', '42')).toBe('42');
  });
});

describe('arrayItemKind', () => {
  test('reads the item kind from the array type', () => {
    expect(arrayItemKind(field({ name: 'a', kind: 'array', type: 'boolean[]' }))).toBe('boolean');
    expect(arrayItemKind(field({ name: 'a', kind: 'array', type: 'integer(int64)[]' }))).toBe('integer');
    expect(arrayItemKind(field({ name: 'a', kind: 'array', type: 'string[]' }))).toBe('string');
  });
});

describe('initBodyValues', () => {
  test('sets booleans to false, arrays to [], objects to {}, and leaves other scalars unset', () => {
    const fields = flattenSchema({
      type: 'object',
      properties: {
        active: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        meta: { type: 'object', properties: { note: { type: 'string' } } },
        name: { type: 'string' },
        count: { type: 'integer' },
      },
    });
    expect(initBodyValues(fields)).toEqual({ active: false, tags: [], meta: {} });
  });

  test('uses the schema default when one is given', () => {
    const fields = flattenSchema({
      type: 'object',
      properties: {
        active: { type: 'boolean', default: true },
        count: { type: 'integer', default: 10 },
      },
    });
    expect(initBodyValues(fields)).toEqual({ active: true, count: 10 });
  });
});

describe('pruneBody', () => {
  test('removes unset and empty values', () => {
    expect(pruneBody({ a: undefined, b: '', c: [], d: {} })).toEqual({});
  });

  test('keeps false and 0', () => {
    expect(pruneBody({ active: false, count: 0 })).toEqual({ active: false, count: 0 });
  });

  test('removes nested empty values and empty parents', () => {
    expect(pruneBody({ meta: { note: '', inner: { x: undefined } }, name: 'n' })).toEqual({ name: 'n' });
  });

  test('removes empty array items but keeps typed items', () => {
    expect(pruneBody({ flags: [true, '', false], ids: [1, 0] })).toEqual({ flags: [true, false], ids: [1, 0] });
  });

  test('does not send null for unset fields', () => {
    const result = pruneBody({ name: undefined, count: '' }) as Record<string, unknown>;
    expect(JSON.stringify(result)).toBe('{}');
  });
});
