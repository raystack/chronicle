'use client'

import { Breadcrumb } from '@raystack/apsara'
import type { PageTree, PageTreeItem } from '../../types'

interface BreadcrumbsProps {
  slug: string[]
  tree: PageTree
}

function findInTree(items: PageTreeItem[], segment: string): PageTreeItem | undefined {
  for (const item of items) {
    const itemSlug = item.url?.split('/').pop()
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

export function Breadcrumbs({ slug, tree }: BreadcrumbsProps) {
  const items: { label: string; href: string }[] = []

  let currentPath = '/docs'
  for (const segment of slug) {
    currentPath = `${currentPath}/${segment}`
    const node = findInTree(tree.children, segment)
    items.push({
      label: node?.name ?? segment,
      href: currentPath,
    })
  }

  return (
    <Breadcrumb size="small">
      <Breadcrumb.Item href="/docs">Docs</Breadcrumb.Item>
      {items.flatMap((item, index) => [
        <Breadcrumb.Separator key={`sep-${item.href}`} style={{ display: 'flex' }} />,
        <Breadcrumb.Item
          key={item.href}
          href={item.href}
          current={index === items.length - 1}
        >
          {item.label}
        </Breadcrumb.Item>,
      ])}
    </Breadcrumb>
  )
}
