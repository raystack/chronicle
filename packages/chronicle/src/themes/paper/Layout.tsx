'use client'

import { Flex, Headline } from '@raystack/apsara'
import { cx } from 'class-variance-authority'
import { Footer } from '../../components/ui/footer'
import { ChapterNav } from './ChapterNav'
import type { ThemeLayoutProps } from '../../types'
import styles from './Layout.module.css'

export function Layout({ children, config, tree, classNames }: ThemeLayoutProps) {
  return (
    <Flex direction="column" className={cx(styles.layout, classNames?.layout)}>
      <Flex className={cx(styles.body, classNames?.body)}>
        <aside className={cx(styles.sidebar, classNames?.sidebar)}>
          <Headline size="small" weight="medium" as="h1" className={styles.title}>
            {config.title}
          </Headline>
          <ChapterNav tree={tree} />
        </aside>
        <div className={cx(styles.content, classNames?.content)}>{children}</div>
      </Flex>
      <Footer config={config.footer} />
    </Flex>
  )
}
