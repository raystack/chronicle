'use client'

import { Flex, Headline, Text } from '@raystack/apsara'
import type { ThemePageProps } from '../../types'
import { Toc } from './Toc'
import styles from './Page.module.css'

export function Page({ page }: ThemePageProps) {
  return (
    <Flex className={styles.page}>
      <article className={styles.article}>
        <header className={styles.header}>
          <Headline as="h1" size="large">
            {page.frontmatter.title}
          </Headline>
          {page.frontmatter.description && (
            <Text size={4} className={styles.description}>
              {page.frontmatter.description}
            </Text>
          )}
        </header>
        <div className={styles.content}>
          {page.content}
        </div>
      </article>
      <Toc items={page.toc} />
    </Flex>
  )
}
