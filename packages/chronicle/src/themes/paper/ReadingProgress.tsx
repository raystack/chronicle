'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '../../types'
import styles from './ReadingProgress.module.css'

interface ReadingProgressProps {
  items: TocItem[]
}

export function ReadingProgress({ items }: ReadingProgressProps) {
  const [activeId, setActiveId] = useState<string>('')

  const h2Items = items.filter((item) => item.depth === 2)

  useEffect(() => {
    const headingIds = h2Items.map((item) => item.url.replace('#', ''))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-80px 0px -80% 0px' }
    )

    headingIds.forEach((id) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [h2Items])

  if (h2Items.length === 0) return null

  return (
    <aside className={styles.ruler}>
      <nav className={styles.nav}>
        {h2Items.map((item) => {
          const id = item.url.replace('#', '')
          const isActive = activeId === id
          return (
            <a
              key={item.url}
              href={item.url}
              className={`${styles.mark} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.dash}>—</span>
              <span className={styles.label}>{item.title}</span>
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
