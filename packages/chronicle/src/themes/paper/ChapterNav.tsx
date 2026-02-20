'use client'

import { usePathname } from 'next/navigation'
import NextLink from 'next/link'
import { MethodBadge } from '@/components/api/method-badge'
import type { PageTree, PageTreeItem } from '@/types'
import styles from './ChapterNav.module.css'

const iconMap: Record<string, React.ReactNode> = {
  'method-get': <MethodBadge method="GET" size="micro" />,
  'method-post': <MethodBadge method="POST" size="micro" />,
  'method-put': <MethodBadge method="PUT" size="micro" />,
  'method-delete': <MethodBadge method="DELETE" size="micro" />,
  'method-patch': <MethodBadge method="PATCH" size="micro" />,
}

interface ChapterNavProps {
  tree: PageTree
}

function buildChapterIndices(children: PageTreeItem[]): Map<PageTreeItem, number> {
  const indices = new Map<PageTreeItem, number>()
  let index = 0
  for (const item of children) {
    if (item.type === 'folder' && item.children) {
      index++
      indices.set(item, index)
    }
  }
  return indices
}

export function ChapterNav({ tree }: ChapterNavProps) {
  const pathname = usePathname()
  const chapterIndices = buildChapterIndices(tree.children)

  return (
    <nav className={styles.nav}>
      <ul className={styles.chapterItems}>
        {tree.children.map((item) => {
          if (item.type === 'separator') return null

          if (item.type === 'folder' && item.children) {
            const chapterIndex = chapterIndices.get(item) ?? 0
            return (
              <li key={item.name} className={styles.chapter}>
                <span className={styles.chapterLabel}>
                  {String(chapterIndex).padStart(2, '0')}. {item.name}
                </span>
                <ul className={styles.chapterItems}>
                  {item.children.map((child) => (
                    <ChapterItem key={child.url ?? child.name} item={child} pathname={pathname} />
                  ))}
                </ul>
              </li>
            )
          }

          return <ChapterItem key={item.url ?? item.name} item={item} pathname={pathname} />
        })}
      </ul>
    </nav>
  )
}

function ChapterItem({ item, pathname }: { item: PageTreeItem; pathname: string }) {
  if (item.type === 'separator') return null

  if (item.type === 'folder' && item.children) {
    return (
      <li>
        <span className={styles.subLabel}>{item.name}</span>
        <ul className={styles.chapterItems}>
          {item.children.map((child) => (
            <ChapterItem key={child.url ?? child.name} item={child} pathname={pathname} />
          ))}
        </ul>
      </li>
    )
  }

  const isActive = pathname === item.url
  const icon = item.icon ? iconMap[item.icon] : null

  return (
    <li>
      <NextLink
        href={item.url ?? '#'}
        className={`${styles.link} ${isActive ? styles.active : ''}`}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <span>{item.name}</span>
      </NextLink>
    </li>
  )
}
