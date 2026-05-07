import type { ReactNode } from 'react'
import type { Root } from 'fumadocs-core/page-tree'
import type { ChronicleConfig } from './config'
import type { Page } from './content'

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

export interface Theme {
  Layout: React.ComponentType<ThemeLayoutProps>
  Page: React.ComponentType<ThemePageProps>
  Skeleton: React.ComponentType
  className?: string
}
