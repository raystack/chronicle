/**
 * Turns `theme.colors` from `chronicle.yaml` into a stylesheet. A bare key is
 * an Apsara token and takes the `--rs-color-` prefix; a full custom property is
 * used as written.
 */

/** A token name or a full custom property. Nothing else reaches the CSS. */
const KEY_PATTERN = /^(--)?[a-z][a-z0-9-]*$/

/** Colours only. This is written into a stylesheet, so keep it narrow. */
const VALUE_PATTERN = /^[a-zA-Z0-9#(),.%\s/_-]+$/

function toCustomProperty(key: string): string {
  return key.startsWith('--') ? key : `--rs-color-${key}`
}

/** Declarations for a config's colours. Malformed entries are dropped. */
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

  // Apsara's dark values sit behind `[data-theme]`, which outranks a bare
  // `:root` — so both selectors are needed for an override to hold.
  return `:root,\n:root[data-theme='light'],\n:root[data-theme='dark'] {\n  ${declarations.join('\n  ')}\n}`
}
