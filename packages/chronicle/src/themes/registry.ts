import './fonts/departure-mono.css';
import type { Theme } from '@/types';
import { defaultTheme } from './default';
import { fanfoldTheme } from './fanfold';
import { paperTheme } from './paper';

const themes: Record<string, Theme> = {
  default: defaultTheme,
  paper: paperTheme,
  fanfold: fanfoldTheme
};

export function getTheme(name?: string): Theme {
  if (!name || !themes[name]) return defaultTheme;

  return themes[name];
}

export interface ThemeConfig {
  enableSystem: boolean;
  /** Pin the theme, ignoring the user's choice. No theme sets one today. */
  forcedTheme?: string;
}

export function getThemeConfig(_name?: string): ThemeConfig {
  return { enableSystem: true };
}
