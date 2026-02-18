import type { ReactNode } from 'react'
import type { ChronicleConfig } from './config'
import type { Page, PageTree } from './content'

export interface ThemeLayoutProps {
  children: ReactNode
  config: ChronicleConfig
  tree: PageTree
  classNames?: { layout?: string; body?: string; sidebar?: string; content?: string }
}

export interface ThemePageProps {
  page: Page
  config: ChronicleConfig
  tree: PageTree
}

export interface Theme {
  Layout: React.ComponentType<ThemeLayoutProps>
  Page: React.ComponentType<ThemePageProps>
}
