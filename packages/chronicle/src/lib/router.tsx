'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type AnchorHTMLAttributes,
  forwardRef,
} from 'react'

interface RouterContextValue {
  pathname: string
  push: (url: string) => void
  replace: (url: string) => void
  back: () => void
  forward: () => void
}

const RouterContext = createContext<RouterContextValue>({
  pathname: '/',
  push: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
})

export function RouterProvider({ children, initialUrl }: { children: ReactNode; initialUrl?: string }) {
  const [pathname, setPathname] = useState(() => {
    if (initialUrl) {
      try { return new URL(initialUrl, 'http://localhost').pathname } catch { return '/' }
    }
    if (typeof window !== 'undefined') return window.location.pathname
    return '/'
  })

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const push = useCallback((url: string) => {
    window.history.pushState(null, '', url)
    setPathname(new URL(url, window.location.origin).pathname)
  }, [])

  const replace = useCallback((url: string) => {
    window.history.replaceState(null, '', url)
    setPathname(new URL(url, window.location.origin).pathname)
  }, [])

  const back = useCallback(() => window.history.back(), [])
  const forward = useCallback(() => window.history.forward(), [])

  return (
    <RouterContext.Provider value={{ pathname, push, replace, back, forward }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter() {
  return useContext(RouterContext)
}

export function usePathname() {
  return useContext(RouterContext).pathname
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  scroll?: boolean
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  function Link({ href, onClick, scroll, children, ...props }, ref) {
    const { push } = useRouter()

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (onClick) onClick(e)
        if (e.defaultPrevented) return
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        if (e.button !== 0) return

        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return

        e.preventDefault()
        push(href)

        if (scroll !== false) {
          window.scrollTo(0, 0)
        }
      },
      [href, onClick, push, scroll],
    )

    return (
      <a ref={ref} href={href} onClick={handleClick} {...props}>
        {children}
      </a>
    )
  },
)
