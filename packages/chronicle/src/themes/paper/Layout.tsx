'use client'

import { Flex, Headline } from '@raystack/apsara'
import { Footer } from '../../components/ui/footer'
import { ChapterNav } from './ChapterNav'
import type { ThemeLayoutProps } from '../../types'
import styles from './Layout.module.css'

export function Layout({ children, config, tree }: ThemeLayoutProps) {
  return (
    <Flex direction="column" className={styles.layout}>
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
