'use client'

import { Flex, Navbar, Headline, Link, Sidebar } from '@raystack/apsara'
import type { ThemeLayoutProps, PageTreeItem } from '../../types'
import styles from './Layout.module.css'

export function Layout({ children, config, tree }: ThemeLayoutProps) {
  return (
    <Flex direction="column" className={styles.layout}>
      <Navbar className={styles.header}>
        <Navbar.Start>
          <Headline size="small" weight="medium" as="h1">
            {config.title}
          </Headline>
        </Navbar.Start>
        <Navbar.End>
          <Flex gap="medium">
            {config.navigation?.links?.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </Flex>
          {config.search?.enabled && (
            <div className={styles.search}>
              {/* Search component will be added later */}
            </div>
          )}
        </Navbar.End>
      </Navbar>
      <Flex className={styles.body}>
        <Sidebar defaultOpen collapsible={false} className={styles.sidebar}>
          <Sidebar.Main>
            {tree.children.map((item) => (
              <SidebarNode key={item.url ?? item.name} item={item} />
            ))}
          </Sidebar.Main>
        </Sidebar>
        <main className={styles.content}>
          {children}
        </main>
      </Flex>
    </Flex>
  )
}

function SidebarNode({ item }: { item: PageTreeItem }) {
  if (item.type === 'separator') {
    return null
  }

  if (item.type === 'folder' && item.children) {
    return (
      <Sidebar.Group label={item.name}>
        {item.children.map((child) => (
          <SidebarNode key={child.url ?? child.name} item={child} />
        ))}
      </Sidebar.Group>
    )
  }

  return (
    <Sidebar.Item href={item.url ?? '#'}>
      {item.name}
    </Sidebar.Item>
  )
}
