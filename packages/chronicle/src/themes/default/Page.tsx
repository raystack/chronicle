'use client'

import { Flex } from '@raystack/apsara'
import type { ThemePageProps } from '../../types'
import { Toc } from './Toc'
import styles from './Page.module.css'

export function Page({ page }: ThemePageProps) {
  return (
    <Flex className={styles.page}>
      <article className={styles.article}>
        <div className={styles.content}>
          {page.content}
        </div>
      </article>
      <Toc items={page.toc} />
    </Flex>
  )
}
