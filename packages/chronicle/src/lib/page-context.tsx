import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { ChronicleConfig, Frontmatter, PageTree } from '@/types'
import { getPage, loadPageComponent, buildPageTree } from '@/lib/source'
import { mdxComponents } from '@/components/mdx'
import React from 'react'

interface PageData {
  slug: string[]
  frontmatter: Frontmatter
  content: ReactNode
}

interface PageContextValue {
  config: ChronicleConfig
  tree: PageTree
  page: PageData | null
}

const PageContext = createContext<PageContextValue | null>(null)

export function usePageContext(): PageContextValue {
  const ctx = useContext(PageContext)
  if (!ctx) {
    console.error('usePageContext: no context found!')
    return {
      config: { title: 'Documentation' },
      tree: { name: 'root', children: [] },
      page: null,
    }
  }
  return ctx
}

interface PageProviderProps {
  initialConfig: ChronicleConfig
  initialTree: PageTree
  initialPage: PageData | null
  children: ReactNode
}

export function PageProvider({ initialConfig, initialTree, initialPage, children }: PageProviderProps) {
  const { pathname } = useLocation()
  const [tree, setTree] = useState<PageTree>(initialTree)
  const [page, setPage] = useState<PageData | null>(initialPage)
  const [currentPath, setCurrentPath] = useState(pathname)

  useEffect(() => {
    if (pathname === currentPath) return
    setCurrentPath(pathname)

    let cancelled = false
    async function load() {
      const slug = pathname === '/' ? [] : pathname.slice(1).split('/').filter(Boolean)

      // Skip non-docs routes
      if (pathname.startsWith('/apis')) return

      const [sourcePage, newTree] = await Promise.all([getPage(slug), buildPageTree()])
      if (cancelled || !sourcePage) return

      const component = await loadPageComponent(sourcePage)
      if (cancelled) return

      setTree(newTree)
      setPage({
        slug,
        frontmatter: sourcePage.frontmatter,
        content: component ? React.createElement(component, { components: mdxComponents }) : null,
      })
    }
    load()
    return () => { cancelled = true }
  }, [pathname])

  return (
    <PageContext.Provider value={{ config: initialConfig, tree, page }}>
      {children}
    </PageContext.Provider>
  )
}
