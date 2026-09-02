import type { ReactNode } from 'react'
import type { Root } from 'fumadocs-core/page-tree'
import type { ChronicleConfig } from './config'
import type { LandingEntry, Page } from './content'

export interface ThemeLayoutProps {
  children: ReactNode
  config: ChronicleConfig
  tree: Root
  hideSidebar?: boolean
  classNames?: { layout?: string; body?: string; sidebar?: string; content?: string }
}

export interface ThemePageProps {
  page: Page
  config: ChronicleConfig
  tree: Root
}

/**
 * Props for a theme's own landing page. Everything is resolved by the shared
 * `LandingPage` wrapper, so a theme's `Landing` is presentation only — it never
 * reads config or the router itself.
 */
export interface ThemeLandingProps {
  config: ChronicleConfig
  /** Content roots to offer, in config order. Never empty when this renders. */
  entries: LandingEntry[]
  /** Site title, suffixed with the version label when one is being viewed. */
  heading: string
  description?: string
  /** Label of the version being viewed, latest included. Null if unlabelled. */
  versionLabel: string | null
}

export interface Theme {
  Layout: React.ComponentType<ThemeLayoutProps>
  Page: React.ComponentType<ThemePageProps>
  Skeleton: React.ComponentType
  /**
   * Optional. Themes that leave this out fall back to the shared landing page
   * in `pages/LandingPage.tsx`.
   */
  Landing?: React.ComponentType<ThemeLandingProps>
  className?: string
}
