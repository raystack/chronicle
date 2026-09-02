'use client'

import { Breadcrumb } from '@raystack/apsara'
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb'
import type { Root } from 'fumadocs-core/page-tree'
import { Link as RouterLink } from 'react-router'

interface BreadcrumbsProps {
  slug: string[]
  tree: Root
  className?: string
}

export function Breadcrumbs({ slug, tree, className }: BreadcrumbsProps) {
  const url = slug.length === 0 ? '/' : `/${slug.join('/')}`
  const items = getBreadcrumbItems(url, tree, { includePage: true })

  if (items.length === 0) return null

  return (
    <Breadcrumb size="small" className={className}>
      {items.flatMap((item, index) => {
        const isCurrent = index === items.length - 1
        const breadcrumbItem = (
          <Breadcrumb.Item
            key={`item-${index}`}
            current={isCurrent}
            render={isCurrent || !item.url ? undefined : <RouterLink to={item.url} />}
          >
            {item.name}
          </Breadcrumb.Item>
        )
        if (index === 0) return [breadcrumbItem]
        return [
          <Breadcrumb.Separator key={`sep-${index}`} style={{ display: 'flex' }} />,
          breadcrumbItem,
        ]
      })}
    </Breadcrumb>
  )
}
