'use client'

import { cx } from 'class-variance-authority'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TocItem } from '../../types'
import styles from './ReadingProgress.module.css'

interface Heading {
  title: string
  level: number
  id: string
  url: string
  yPosition: number
}

const ARTICLE_SELECTOR = '[data-article-content]'
const TICK_HEIGHT = 20
const NAV_HEIGHT = 60

function calculateTickBounds(containerHeight: number) {
  const numTicks = Math.floor(containerHeight / TICK_HEIGHT) + 1
  const maxPosition = (numTicks - 1) * TICK_HEIGHT
  return { numTicks, maxPosition }
}

function snapToTick(value: number, maxPosition: number): number {
  const snapped = Math.round(value / TICK_HEIGHT) * TICK_HEIGHT
  return Math.max(0, Math.min(snapped, maxPosition))
}

function resolveOverlaps(headings: Heading[], maxPosition: number): Heading[] {
  if (headings.length <= 1) return headings

  const resolved: Heading[] = []
  let lastUsedPos = -TICK_HEIGHT

  for (const heading of headings) {
    let newPos = heading.yPosition
    if (newPos <= lastUsedPos) {
      newPos = lastUsedPos + TICK_HEIGHT
    }
    resolved.push({ ...heading, yPosition: newPos })
    lastUsedPos = newPos
  }

  for (let i = resolved.length - 1; i >= 0; i--) {
    const maxAllowed =
      i === resolved.length - 1
        ? maxPosition
        : resolved[i + 1].yPosition - TICK_HEIGHT

    if (resolved[i].yPosition > maxAllowed) {
      resolved[i] = { ...resolved[i], yPosition: Math.max(0, maxAllowed) }
    }
  }

  return resolved
}

interface ReadingProgressProps {
  items: TocItem[]
}

export function ReadingProgress({ items }: ReadingProgressProps) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [containerHeight, setContainerHeight] = useState<number>(0)
  const [ready, setReady] = useState<boolean>(false)
  const [isScrollable, setIsScrollable] = useState<boolean>(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollMarkerRef = useRef<HTMLDivElement>(null)
  const scrollPosRef = useRef<number>(0)

  const { numTicks, maxPosition } = useMemo(
    () => calculateTickBounds(containerHeight),
    [containerHeight]
  )

  const recalcHeadings = useCallback(() => {
    const article = document.querySelector(ARTICLE_SELECTOR)
    const container = containerRef.current
    if (!article || !container || !items.length) return

    const articleBox = article.getBoundingClientRect()
    const containerBox = container.getBoundingClientRect()
    const articleTop = articleBox.top + window.scrollY

    const hasScroll = articleBox.height > window.innerHeight
    setIsScrollable(hasScroll)
    setContainerHeight(containerBox.height)

    const { maxPosition: maxPos } = calculateTickBounds(containerBox.height)

    const mapped = items
      .map((tocItem) => {
        const id = tocItem.url.startsWith('#') ? tocItem.url.slice(1) : tocItem.url
        const node = document.getElementById(id)
        if (!node) return null

        const { top } = node.getBoundingClientRect()
        const headingPosInArticle = top + window.scrollY - articleTop
        const progress = headingPosInArticle / articleBox.height
        const rawY = progress * maxPos
        const yPos = snapToTick(rawY, maxPos)

        return {
          title: tocItem.title,
          level: tocItem.depth,
          id,
          url: tocItem.url,
          yPosition: yPos,
        }
      })
      .filter((item): item is Heading => item !== null)

    const resolvedItems = resolveOverlaps(mapped, maxPos)
    setHeadings(resolvedItems)
  }, [items])

  // Imperative DOM updates to avoid React re-render on every scroll event
  const handleScroll = useCallback(() => {
    const article = document.querySelector(ARTICLE_SELECTOR)
    const container = containerRef.current
    const scrollMarker = scrollMarkerRef.current
    if (!article || !container || !scrollMarker) return

    const { top, height } = article.getBoundingClientRect()
    const { height: cHeight } = container.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const { maxPosition: maxPos } = calculateTickBounds(cHeight)

    let newScrollPos: number
    if (top > 0) {
      newScrollPos = 0
    } else {
      const scrolled = Math.abs(top)
      const scrollRange = height - viewportHeight
      const progress = scrollRange > 0 ? Math.min(1, scrolled / scrollRange) : 0
      const rawPos = progress * maxPos
      newScrollPos = snapToTick(rawPos, maxPos)
    }

    const prevScrollPos = scrollPosRef.current
    if (newScrollPos !== prevScrollPos) {
      scrollPosRef.current = newScrollPos
      scrollMarker.style.top = `${newScrollPos}px`

      const textEl = scrollMarker.querySelector('[data-scroll-text]')
      if (textEl) {
        textEl.textContent = (maxPos > 0 ? newScrollPos / maxPos : 0).toFixed(2)
      }

      const tickLines = container.querySelectorAll('[data-tick-line]')
      tickLines.forEach((tick) => {
        const tickPos = Number(tick.getAttribute('data-tick-pos'))
        if (tickPos < newScrollPos) {
          tick.classList.remove(styles.tickLineAfter)
          tick.classList.add(styles.tickLineBefore)
        } else {
          tick.classList.remove(styles.tickLineBefore)
          tick.classList.add(styles.tickLineAfter)
        }
      })
    }
  }, [])

  useEffect(() => {
    recalcHeadings()
    handleScroll()
    setReady(true)

    const article = document.querySelector(ARTICLE_SELECTOR)
    let ro: ResizeObserver | undefined
    if (article) {
      ro = new ResizeObserver(() => {
        recalcHeadings()
        handleScroll()
      })
      ro.observe(article)
    }

    window.addEventListener('resize', recalcHeadings)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', recalcHeadings)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [recalcHeadings, handleScroll])

  const scrollToTick = (y: number): void => {
    const article = document.querySelector(ARTICLE_SELECTOR)
    if (!article || maxPosition === 0) return

    const articleBox = article.getBoundingClientRect()
    const articleTop = articleBox.top + window.scrollY
    const progress = y / maxPosition
    const articlePos = progress * articleBox.height
    const targetScroll = articleTop + articlePos - NAV_HEIGHT

    window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
  }

  const scrollToHeading = (id: string): void => {
    const element = document.getElementById(id)
    if (!element) return

    const elementTop = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: Math.max(0, elementTop - NAV_HEIGHT), behavior: 'smooth' })
  }

  const ticks = useMemo(
    () => Array.from({ length: numTicks }, (_, i) => i * TICK_HEIGHT),
    [numTicks]
  )

  if (!isScrollable || ticks.length < 2) {
    return <div ref={containerRef} className={styles.container} />
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.inner}>
        {ticks.map((y, i) => (
          <div key={`tick-${i}`} style={{ top: `${y}px` }} className={styles.tickContainer}>
            <div data-tick-line data-tick-pos={y} className={cx(styles.tickLine, styles.tickLineAfter)} />
            <div className={styles.tickClickable} onClick={() => scrollToTick(y)} />
          </div>
        ))}

        {headings.map((h, i) => (
          <div key={h.id || i} className={styles.headingContainer}>
            <div
              className={styles.headingLabel}
              style={{
                top: `${h.yPosition - 6}px`,
                right: '24px',
                zIndex: 10 * (h.level < 4 ? 1 : 0),
                transitionDelay: `${50 * i}ms`,
              }}
            >
              <a
                href={h.url}
                className={styles.headingLink}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  scrollToHeading(h.id)
                }}
              >
                {h.title}
              </a>
            </div>
          </div>
        ))}

        {headings.map((h, i) => (
          <div
            key={`line-${i}`}
            className={styles.connectingLine}
            style={{
              top: `${h.yPosition}px`,
              width: `${Math.max(4, (3 - h.level) * 4 + 12)}px`,
            }}
          />
        ))}

        <div
          ref={scrollMarkerRef}
          className={cx(
            styles.scrollMarkerContainer,
            ready ? styles.scrollMarkerContainerReady : styles.scrollMarkerContainerNotReady
          )}
          style={{ top: '0px' }}
        >
          <div className={styles.scrollMarkerLine} />
          <span data-scroll-text className={styles.scrollMarkerText}>
            0.00
          </span>
        </div>
      </div>
    </div>
  )
}
