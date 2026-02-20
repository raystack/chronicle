'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import NextLink from 'next/link'
import { Flex } from '@raystack/apsara'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { ThemePageProps, PageTreeItem } from '../../types'
import { Search } from '../../components/ui/search'
import { ReadingProgress } from './ReadingProgress'
import styles from './Page.module.css'

function flattenTree(items: PageTreeItem[]): PageTreeItem[] {
  const result: PageTreeItem[] = []
  for (const item of items) {
    if (item.type === 'page' && item.url) result.push(item)
    if (item.children) result.push(...flattenTree(item.children))
  }
  return result
}

function findBreadcrumb(items: PageTreeItem[], slug: string[]): { label: string; href: string }[] {
  const result: { label: string; href: string }[] = []
  for (let i = 0; i < slug.length; i++) {
    const path = '/' + slug.slice(0, i + 1).join('/')
    const found = findInTree(items, path)
    result.push({ label: found?.name ?? slug[i], href: path })
  }
  return result
}

function findInTree(items: PageTreeItem[], path: string): PageTreeItem | undefined {
  for (const item of items) {
    if (item.url === path) return item
    if (item.children) {
      const found = findInTree(item.children, path)
      if (found) return found
    }
  }
  return undefined
}

export function Page({ page, config, tree }: ThemePageProps) {
  const pathname = usePathname()

  const { prev, next, crumbs } = useMemo(() => {
    const pages = flattenTree(tree.children)
    const currentIndex = pages.findIndex((p) => p.url === pathname)
    return {
      prev: currentIndex > 0 ? pages[currentIndex - 1] : null,
      next: currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null,
      crumbs: findBreadcrumb(tree.children, page.slug),
    }
  }, [tree, pathname, page.slug])

  return (
    <>
      <main className={styles.main}>
        <Flex align="center" className={styles.navbar}>
          <Flex align="center" gap="small" className={styles.navLeft}>
            {prev ? (
              <NextLink href={prev.url!} className={styles.arrow} aria-label="Previous page">
                <ChevronLeftIcon width={14} height={14} />
              </NextLink>
            ) : (
              <button disabled className={styles.arrowDisabled} aria-label="Previous page">
                <ChevronLeftIcon width={14} height={14} />
              </button>
            )}
            {next ? (
              <NextLink href={next.url!} className={styles.arrow} aria-label="Next page">
                <ChevronRightIcon width={14} height={14} />
              </NextLink>
            ) : (
              <button disabled className={styles.arrowDisabled} aria-label="Next page">
                <ChevronRightIcon width={14} height={14} />
              </button>
            )}
            <nav className={styles.breadcrumb}>
              {crumbs.map((crumb, i) => (
                <span key={crumb.href}>
                  {i > 0 && <span className={styles.separator}>/</span>}
                  {i === crumbs.length - 1 ? (
                    <span className={styles.crumbActive}>{crumb.label}</span>
                  ) : (
                    <NextLink href={crumb.href} className={styles.crumbLink}>
                      {crumb.label}
                    </NextLink>
                  )}
                </span>
              ))}
            </nav>
          </Flex>
          <Flex align="center" className={styles.navRight}>
            {config.search?.enabled && <Search className={styles.searchButton} />}
          </Flex>
        </Flex>
        <article className={styles.article} data-article-content>
          <div className={styles.content}>
            {page.content}
          </div>
        </article>
      </main>
      <ReadingProgress items={page.toc} />
    </>
  )
}
