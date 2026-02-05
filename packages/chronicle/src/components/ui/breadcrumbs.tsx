'use client'

import { Breadcrumb } from '@raystack/apsara'
import type { PageTree, PageTreeItem } from '../../types'

interface BreadcrumbsProps {
  slug: string[]
  tree: PageTree
}

function findInTree(items: PageTreeItem[], targetPath: string): PageTreeItem | undefined {
  for (const item of items) {
    const itemUrl = item.url || `/${item.name.toLowerCase().replace(/\s+/g, '-')}`
    if (itemUrl === targetPath || itemUrl === `/${targetPath}`) {
      return item
    }
    if (item.children) {
      const found = findInTree(item.children, targetPath)
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

  for (let i = 0; i < slug.length; i++) {
    const currentPath = `/${slug.slice(0, i + 1).join('/')}`
    const node = findInTree(tree.children, currentPath)
    const href = node?.url || (node && getFirstPageUrl(node)) || currentPath
    const label = node?.name ?? slug[i]
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
