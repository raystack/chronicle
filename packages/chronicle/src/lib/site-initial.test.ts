import { describe, expect, test } from 'bun:test'
import { siteInitial } from './site-initial'

describe('siteInitial', () => {
  test('takes the first letter, uppercased', () => {
    expect(siteInitial('Chronicle')).toBe('C')
    expect(siteInitial('my documentation')).toBe('M')
  })

  test('ignores surrounding space', () => {
    expect(siteInitial('  Chronicle  ')).toBe('C')
  })

  test('keeps a whole codepoint', () => {
    // Splitting on UTF-16 units would return half a surrogate pair.
    expect(siteInitial('🚀 Launch')).toBe('🚀')
    expect(siteInitial('日本語ドキュメント')).toBe('日')
  })

  test('falls back when there is nothing to take', () => {
    expect(siteInitial('')).toBe('?')
    expect(siteInitial('   ')).toBe('?')
  })
})
