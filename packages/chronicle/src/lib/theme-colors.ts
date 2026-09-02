/**
 * Turns `theme.colors` from `chronicle.yaml` into a stylesheet.
 *
 * Keys name an Apsara colour token. Write the token on its own —
 * `background-base-primary` — and the `--rs-color-` prefix is added, or write
 * the whole custom property yourself if you need one outside that family.
 *
 * The same value applies in light and dark, because the config takes one value
 * per token. A site that needs two different colours should leave the token
 * alone and let the theme pick.
 */

/** A token name, or a full custom property. Nothing else can reach the CSS. */
const KEY_PATTERN = /^(--)?[a-z][a-z0-9-]*$/

/**
 * Colours only: hex, `rgb()`, `hsl()`, `color-mix()`, a named colour, or
 * another custom property. Deliberately narrow — this string is written into a
 * stylesheet, so anything that could close a declaration or open a rule has to
 * be impossible.
 */
const VALUE_PATTERN = /^[a-zA-Z0-9#(),.%\s/_-]+$/

function toCustomProperty(key: string): string {
  return key.startsWith('--') ? key : `--rs-color-${key}`
}

/**
 * The declarations for a config's colours, or an empty string when there are
 * none to write. Entries that do not look like a token and a colour are
 * dropped rather than passed through.
 */
export function buildThemeColorCss(
  colors: Record<string, string> | undefined,
): string {
  if (!colors) return ''

  const declarations = Object.entries(colors)
    .filter(
      ([key, value]) =>
        KEY_PATTERN.test(key) &&
        typeof value === 'string' &&
        value.length > 0 &&
        VALUE_PATTERN.test(value),
    )
    .map(([key, value]) => `${toCustomProperty(key)}: ${value.trim()};`)

  if (declarations.length === 0) return ''

  // Both `data-theme` selectors are listed so an override still wins once a
  // reader picks a theme explicitly — Apsara defines its dark values behind
  // that attribute, which outranks a bare `:root`.
  return `:root,\n:root[data-theme='light'],\n:root[data-theme='dark'] {\n  ${declarations.join('\n  ')}\n}`
}
