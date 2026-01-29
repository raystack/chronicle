import { Flex, Container, Box, Navbar, Headline, Link } from '@raystack/apsara'
import type { ThemeLayoutProps } from '../../types'
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
            <Box className={styles.search}>
              {/* Search component will be added later */}
            </Box>
          )}
        </Navbar.End>
      </Navbar>
      <Flex className={styles.body}>
        <Box as="aside" className={styles.sidebar}>
          <SidebarTree tree={tree} />
        </Box>
        <Container size="medium" as="main" className={styles.content}>
          {children}
        </Container>
      </Flex>
    </Flex>
  )
}

function SidebarTree({ tree }: { tree: ThemeLayoutProps['tree'] }) {
  return (
    <ul className={styles.sidebarList}>
      {tree.children.map((item) => (
        <SidebarItem key={item.name} item={item} />
      ))}
    </ul>
  )
}

function SidebarItem({ item }: { item: ThemeLayoutProps['tree']['children'][number] }) {
  if (item.type === 'separator') {
    return <li className={styles.separator} />
  }

  if (item.type === 'folder' && item.children) {
    return (
      <li className={styles.folder}>
        <span className={styles.folderLabel}>{item.name}</span>
        <ul className={styles.sidebarList}>
          {item.children.map((child) => (
            <SidebarItem key={child.name} item={child} />
          ))}
        </ul>
      </li>
    )
  }

  return (
    <li className={styles.page}>
      <Link href={item.url ?? '#'}>{item.name}</Link>
    </li>
  )
}
