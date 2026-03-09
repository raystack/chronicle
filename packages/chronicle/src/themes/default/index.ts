import { Layout } from './Layout'
import { Page } from './Page'
import { Toc } from './Toc'
import { inter } from './font'
import type { Theme } from '@/types'

export const defaultTheme: Theme = {
  Layout,
  Page,
  className: inter.className,
}

export { Layout, Page, Toc }
