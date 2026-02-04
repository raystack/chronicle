'use client'

import { usePathname } from 'next/navigation'
import { Flex, Navbar, Headline, Link, Sidebar, Text } from '@raystack/apsara'
import type { ThemeLayoutProps, PageTreeItem } from '../../types'
import styles from './Layout.module.css'

export function Layout({ children, config, tree }: ThemeLayoutProps) {
  const pathname = usePathname()

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
              <SidebarNode key={item.url ?? item.name} item={item} pathname={pathname} />
            ))}
          </Sidebar.Main>
        </Sidebar>
        <main className={styles.content}>
          {children}
        </main>
      </Flex>
      <footer className={styles.footer}>
        <Text size={2} className={styles.footerText}>
          Built with Chronicle
        </Text>
      </footer>
    </Flex>
  )
}

function SidebarNode({ item, pathname }: { item: PageTreeItem; pathname: string }) {
  if (item.type === 'separator') {
    return null
  }

  if (item.type === 'folder' && item.children) {
    return (
      <Sidebar.Group label={item.name} classNames={{ items: styles.groupItems }}>
        {item.children.map((child) => (
          <SidebarNode key={child.url ?? child.name} item={child} pathname={pathname} />
        ))}
      </Sidebar.Group>
    )
  }

  const isActive = pathname === item.url

  return (
    <Sidebar.Item href={item.url ?? '#'} active={isActive}>
      {item.name}
    </Sidebar.Item>
  )
}
