'use client'

import { Breadcrumb } from '@raystack/apsara'
import type { PageTree, PageTreeItem } from '../../types'

interface BreadcrumbsProps {
  slug: string[]
  tree: PageTree
}

function findInTree(items: PageTreeItem[], segment: string): PageTreeItem | undefined {
  for (const item of items) {
    const itemSlug = item.url?.split('/').pop() || item.name.toLowerCase().replace(/\s+/g, '-')
    if (itemSlug === segment) {
      return item
    }
    if (item.children) {
      const found = findInTree(item.children, segment)
      if (found) return found
    }
  }
  return undefined
}

function getFirstPageUrl(item: PageTreeItem): string | undefined {
  if (item.type === 'page' && item.url) {
    return item.url
  }
  if (item.children) {
    for (const child of item.children) {
      const url = getFirstPageUrl(child)
      if (url) return url
    }
  }
  return undefined
}

export function Breadcrumbs({ slug, tree }: BreadcrumbsProps) {
  const items: { label: string; href: string }[] = []

  for (const segment of slug) {
    const node = findInTree(tree.children, segment)
    const href = node?.url || (node && getFirstPageUrl(node)) || `/${slug.slice(0, slug.indexOf(segment) + 1).join('/')}`
    const label = node?.name ?? segment
    items.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      href,
    })
  }

  return (
    <Breadcrumb size="small">
      {items.flatMap((item, index) => {
        const breadcrumbItem = (
          <Breadcrumb.Item
            key={`item-${index}`}
            href={item.href}
            current={index === items.length - 1}
          >
            {item.label}
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
