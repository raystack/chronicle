'use client'

import { Flex } from '@raystack/apsara'
import type { ThemePageProps } from '@/types'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Toc } from './Toc'
import styles from './Page.module.css'

export function Page({ page, tree }: ThemePageProps) {
  return (
    <Flex className={styles.page}>
      <article className={styles.article}>
        <Breadcrumbs slug={page.slug} tree={tree} />
        <div className={styles.content}>
          {page.content}
        </div>
      </article>
      <Toc items={page.toc} />
    </Flex>
  )
}
