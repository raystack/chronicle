'use client'

import { Breadcrumb } from '@raystack/apsara'
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb'
import type { Root } from 'fumadocs-core/page-tree'

interface BreadcrumbsProps {
  slug: string[]
  tree: Root
}

export function Breadcrumbs({ slug, tree }: BreadcrumbsProps) {
  const url = slug.length === 0 ? '/' : `/${slug.join('/')}`
  const items = getBreadcrumbItems(url, tree, { includePage: true })

  if (items.length === 0) return null

  return (
    <Breadcrumb size="small">
      {items.flatMap((item, index) => {
        const breadcrumbItem = (
          <Breadcrumb.Item
            key={`item-${index}`}
            href={item.url}
            current={index === items.length - 1}
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
