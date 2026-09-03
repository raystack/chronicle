import { describe, expect, test } from 'bun:test'
import { buildThemeColorCss } from './theme-colors'

describe('buildThemeColorCss', () => {
  test('returns nothing when no colours are set', () => {
    expect(buildThemeColorCss(undefined)).toBe('')
    expect(buildThemeColorCss({})).toBe('')
  })

  test('prefixes a bare token name', () => {
    const css = buildThemeColorCss({ 'background-base-primary': '#ffffff' })
    expect(css).toContain('--rs-color-background-base-primary: #ffffff;')
  })

  test('leaves a full custom property alone', () => {
    const css = buildThemeColorCss({ '--paper-ink': '#101010' })
    expect(css).toContain('--paper-ink: #101010;')
    expect(css).not.toContain('--rs-color---paper-ink')
  })

  test('wins in both themes', () => {
    // Apsara defines its dark values behind `[data-theme]`, which outranks a
    // bare `:root` — so an override listed only there would never apply.
    const css = buildThemeColorCss({ 'foreground-base-primary': 'red' })
    expect(css).toContain(":root[data-theme='dark']")
    expect(css).toContain(":root[data-theme='light']")
  })

  test('accepts colour functions and variable references', () => {
    const css = buildThemeColorCss({
      a: 'rgb(10, 20, 30)',
      b: 'color-mix(in srgb, #fff 50%, #000)',
      c: 'var(--rs-color-background-base-primary)',
    })
    expect(css).toContain('rgb(10, 20, 30)')
    expect(css).toContain('color-mix(in srgb, #fff 50%, #000)')
    expect(css).toContain('var(--rs-color-background-base-primary)')
  })

  test('drops anything that could break out of the declaration', () => {
    const css = buildThemeColorCss({
      good: '#fff',
      'bad-value': 'red; } body { display: none',
      'bad;key': '#000',
      'url-value': 'url(https://evil.example/x.png)',
      'at-rule': '@import "evil.css"',
    })
    expect(css).toContain('--rs-color-good: #fff;')
    expect(css).not.toContain('display: none')
    expect(css).not.toContain('bad;key')
    expect(css).not.toContain('evil.example')
    expect(css).not.toContain('@import')
  })

  test('drops empty and non-string values', () => {
    const css = buildThemeColorCss({
      good: '#fff',
      empty: '',
      nope: undefined as unknown as string,
    })
    expect(css).toContain('--rs-color-good')
    expect(css).not.toContain('--rs-color-empty')
    expect(css).not.toContain('--rs-color-nope')
  })
})
