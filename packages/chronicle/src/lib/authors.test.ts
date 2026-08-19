import { describe, expect, test } from 'bun:test';
import type { ChronicleConfig } from '@/types';
import {
  authorInitials,
  parseAuthor,
  parseAuthors,
  resolveAuthor,
  resolveAuthors,
  slugifyAuthorName,
} from './authors';

describe('parseAuthor', () => {
  test('splits the shorthand into name and email', () => {
    expect(parseAuthor('Jane Doe <jane@example.com>')).toEqual({ slug: 'jane-doe', name: 'Jane Doe', email: 'jane@example.com' })
  })

  test('accepts a bare name', () => {
    expect(parseAuthor('Jane Doe')).toEqual({ slug: 'jane-doe', name: 'Jane Doe' })
  })

  test('trims surrounding and inner whitespace', () => {
    expect(parseAuthor('  Jane Doe   <  jane@example.com  >  ')).toEqual({
      slug: 'jane-doe',
      name: 'Jane Doe',
      email: 'jane@example.com',
    })
  })

  test('keeps angle brackets that do not hold an email in the name', () => {
    expect(parseAuthor('Jane Doe <not an email>')).toEqual({ slug: 'jane-doe-not-an-email', name: 'Jane Doe <not an email>' })
  })

  test('falls back to the address when only an email is given', () => {
    expect(parseAuthor('<jane@example.com>')).toEqual({ slug: 'jane-example-com', name: 'jane@example.com', email: 'jane@example.com' })
  })

  test('returns null for an empty string', () => {
    expect(parseAuthor('   ')).toBeNull()
  })
})

describe('parseAuthors', () => {
  test('parses a list', () => {
    expect(parseAuthors(['Jane Doe <jane@example.com>', 'Sam Patel'])).toEqual([
      { slug: 'jane-doe', name: 'Jane Doe', email: 'jane@example.com' },
      { slug: 'sam-patel', name: 'Sam Patel' },
    ])
  })

  test('accepts a lone string', () => {
    expect(parseAuthors('Jane Doe')).toEqual([{ slug: 'jane-doe', name: 'Jane Doe' }])
  })

  test('drops empty and non-string entries', () => {
    expect(parseAuthors(['Jane Doe', '', 42, null, { name: 'Nope' }])).toEqual([{ slug: 'jane-doe', name: 'Jane Doe' }])
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

const configWithRegistry = {
  authors: {
    jane: {
      name: 'Jane Doe',
      bio: 'Writes about distributed systems.',
      avatar: '/team/jane.png',
      url: 'https://github.com/jane',
    },
  },
} as unknown as ChronicleConfig;

describe('slugifyAuthorName', () => {
  test('lowercases and joins words with dashes', () => {
    expect(slugifyAuthorName('Jane Doe')).toBe('jane-doe')
  })

  test('collapses punctuation and trims stray dashes', () => {
    expect(slugifyAuthorName("  Ana-María O'Brien, Jr.  ")).toBe('ana-mar-a-o-brien-jr')
  })
})

describe('resolveAuthor', () => {
  test('expands a registry key into its profile', () => {
    expect(resolveAuthor('jane', configWithRegistry)).toEqual({
      slug: 'jane',
      name: 'Jane Doe',
      bio: 'Writes about distributed systems.',
      avatar: '/team/jane.png',
      url: 'https://github.com/jane',
    })
  })

  test('falls back to the shorthand for a name that is not a key', () => {
    expect(resolveAuthor('Sam Patel <sam@example.com>', configWithRegistry)).toEqual({
      slug: 'sam-patel',
      name: 'Sam Patel',
      email: 'sam@example.com',
    })
  })

  test('works without a registry', () => {
    expect(resolveAuthor('jane')).toEqual({ slug: 'jane', name: 'jane' })
  })
})

describe('resolveAuthors', () => {
  test('mixes registry keys and literal names', () => {
    expect(resolveAuthors(['jane', 'Sam Patel'], configWithRegistry)).toEqual([
      {
        slug: 'jane',
        name: 'Jane Doe',
        bio: 'Writes about distributed systems.',
        avatar: '/team/jane.png',
        url: 'https://github.com/jane',
      },
      { slug: 'sam-patel', name: 'Sam Patel' },
    ])
  })
})
