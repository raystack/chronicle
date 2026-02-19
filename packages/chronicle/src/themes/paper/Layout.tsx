'use client'

import { Flex, Navbar, Headline } from '@raystack/apsara'
import { ClientThemeSwitcher } from '../../components/ui/client-theme-switcher'
import { Search } from '../../components/ui/search'
import { Footer } from '../../components/ui/footer'
import { ChapterNav } from './ChapterNav'
import { PrevNextNav } from './PrevNextNav'
import type { ThemeLayoutProps } from '../../types'
import styles from './Layout.module.css'

export function Layout({ children, config, tree }: ThemeLayoutProps) {
  return (
    <Flex direction="column" className={styles.layout}>
      <Navbar className={styles.header}>
        <Navbar.Start>
          {config.search?.enabled && <Search />}
        </Navbar.Start>
        <Navbar.End>
          <PrevNextNav tree={tree} />
          <ClientThemeSwitcher size={16} />
        </Navbar.End>
      </Navbar>
      <Flex className={styles.body}>
        <aside className={styles.sidebar}>
          <Headline size="small" weight="medium" as="h1" className={styles.title}>
            {config.title}
          </Headline>
          <ChapterNav tree={tree} />
        </aside>
        <main className={styles.content}>{children}</main>
      </Flex>
      <Footer config={config.footer} />
    </Flex>
  )
}
