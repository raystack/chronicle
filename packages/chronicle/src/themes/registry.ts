import type { Theme } from '../types'
import { defaultTheme } from './default'
import { paperTheme } from './paper'

const themes: Record<string, Theme> = {
  default: defaultTheme,
  paper: paperTheme,
}

export function getTheme(name?: string): Theme {
  if (!name || !themes[name]) return defaultTheme

  return themes[name]
}
