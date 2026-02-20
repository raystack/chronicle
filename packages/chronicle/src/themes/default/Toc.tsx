'use client'

import { useEffect, useState } from 'react'
import { Text } from '@raystack/apsara'
import type { TocItem } from '@/types'
import styles from './Toc.module.css'

interface TocProps {
  items: TocItem[]
}

export function Toc({ items }: TocProps) {
  const [activeId, setActiveId] = useState<string>('')

  // Filter to only show h2 and h3 headings
  const filteredItems = items.filter((item) => item.depth >= 2 && item.depth <= 3)

  useEffect(() => {
    const headingIds = filteredItems.map((item) => item.url.replace('#', ''))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      // -80px top: offset for fixed header, -80% bottom: trigger when heading is in top 20% of viewport
      { rootMargin: '-80px 0px -80% 0px' }
    )

    headingIds.forEach((id) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [filteredItems])

  if (filteredItems.length === 0) return null

  return (
    <aside className={styles.toc}>
      <Text size={1} weight="medium" className={styles.title}>
        On this page
      </Text>
      <nav className={styles.nav}>
        {filteredItems.map((item) => {
          const id = item.url.replace('#', '')
          const isActive = activeId === id
          const isNested = item.depth > 2
          return (
            <a
              key={item.url}
              href={item.url}
              className={`${styles.link} ${isActive ? styles.active : ''} ${isNested ? styles.nested : ''}`}
            >
              {item.title}
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
