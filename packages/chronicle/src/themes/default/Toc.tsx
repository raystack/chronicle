'use client'

import { useEffect, useState } from 'react'
import { Text, Link } from '@raystack/apsara'
import type { TocItem } from '../../types'
import styles from './Page.module.css'

interface TocProps {
  items: TocItem[]
}

export function Toc({ items }: TocProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const headingIds = items.map((item) => item.url.replace('#', ''))

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
  }, [items])

  if (items.length === 0) return null

  return (
    <aside className={styles.toc}>
      <Text size={2} weight="medium" className={styles.tocTitle}>
        On this page
      </Text>
      <ul className={styles.tocList}>
        {items.map((item) => {
          const id = item.url.replace('#', '')
          const isActive = activeId === id
          const indent = (item.depth - 2) * 2 + 2
          return (
            <li
              key={item.url}
              style={{ paddingLeft: `var(--rs-space-${indent})` }}
            >
              <Link
                href={item.url}
                className={`${styles.tocLink} ${isActive ? styles.tocLinkActive : ''}`}
              >
                {item.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
