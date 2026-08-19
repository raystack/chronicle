import { describe, expect, test } from 'bun:test';
import { authorInitials, parseAuthor, parseAuthors } from './authors';

describe('parseAuthor', () => {
  test('splits the shorthand into name and email', () => {
    expect(parseAuthor('Jane Doe <jane@example.com>')).toEqual({ name: 'Jane Doe', email: 'jane@example.com' })
  })

  test('accepts a bare name', () => {
    expect(parseAuthor('Jane Doe')).toEqual({ name: 'Jane Doe' })
  })

  test('trims surrounding and inner whitespace', () => {
    expect(parseAuthor('  Jane Doe   <  jane@example.com  >  ')).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
    })
  })

  test('keeps angle brackets that do not hold an email in the name', () => {
    expect(parseAuthor('Jane Doe <not an email>')).toEqual({ name: 'Jane Doe <not an email>' })
  })

  test('falls back to the address when only an email is given', () => {
    expect(parseAuthor('<jane@example.com>')).toEqual({ name: 'jane@example.com', email: 'jane@example.com' })
  })

  test('returns null for an empty string', () => {
    expect(parseAuthor('   ')).toBeNull()
  })
})

describe('parseAuthors', () => {
  test('parses a list', () => {
    expect(parseAuthors(['Jane Doe <jane@example.com>', 'Sam Patel'])).toEqual([
      { name: 'Jane Doe', email: 'jane@example.com' },
      { name: 'Sam Patel' },
    ])
  })

  test('accepts a lone string', () => {
    expect(parseAuthors('Jane Doe')).toEqual([{ name: 'Jane Doe' }])
  })

  test('drops empty and non-string entries', () => {
    expect(parseAuthors(['Jane Doe', '', 42, null, { name: 'Nope' }])).toEqual([{ name: 'Jane Doe' }])
  })

  test('returns an empty list when the field is missing', () => {
    expect(parseAuthors(undefined)).toEqual([])
  })
})

describe('authorInitials', () => {
  test('takes the first and last initial', () => {
    expect(authorInitials('Jane Doe')).toBe('JD')
  })

  test('takes one initial from a single word', () => {
    expect(authorInitials('Jane')).toBe('J')
  })

  test('skips middle names', () => {
    expect(authorInitials('jane q public')).toBe('JP')
  })

  test('returns an empty string for a blank name', () => {
    expect(authorInitials('   ')).toBe('')
  })
})
