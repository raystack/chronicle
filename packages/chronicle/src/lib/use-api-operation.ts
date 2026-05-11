import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { findApiOperation, type ApiRouteMatch } from '@/lib/api-routes'
import { usePageContext } from '@/lib/page-context'

export function useApiOperation(): ApiRouteMatch | null {
  const { apiSpecs } = usePageContext()
  const { pathname } = useLocation()

  return useMemo(() => {
    const slug = pathname.replace(/^\/apis\//, '').split('/').filter(Boolean)
    if (slug.length !== 2) return null
    return findApiOperation(apiSpecs, slug)
  }, [apiSpecs, pathname])
}
