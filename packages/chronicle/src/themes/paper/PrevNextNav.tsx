'use client'

import { usePathname } from 'next/navigation'
import NextLink from 'next/link'
import type { PageTree, PageTreeItem } from '../../types'
import styles from './PrevNextNav.module.css'

function flattenTree(items: PageTreeItem[]): PageTreeItem[] {
  const result: PageTreeItem[] = []
  for (const item of items) {
    if (item.type === 'page' && item.url) result.push(item)
    if (item.children) result.push(...flattenTree(item.children))
  }
  return result
}

interface PrevNextNavProps {
  tree: PageTree
}

export function PrevNextNav({ tree }: PrevNextNavProps) {
  const pathname = usePathname()
  const pages = flattenTree(tree.children)
  const currentIndex = pages.findIndex((p) => p.url === pathname)

  const prev = currentIndex > 0 ? pages[currentIndex - 1] : null
  const next = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null

  return (
    <nav className={styles.nav}>
      {prev ? (
        <NextLink href={prev.url!} className={styles.arrow}>{'<'}</NextLink>
      ) : (
        <span className={styles.disabled}>{'<'}</span>
      )}
      {next ? (
        <NextLink href={next.url!} className={styles.arrow}>{'>'}</NextLink>
      ) : (
        <span className={styles.disabled}>{'>'}</span>
      )}
    </nav>
  )
}
