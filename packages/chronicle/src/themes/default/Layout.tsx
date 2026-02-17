"use client";

import { usePathname } from "next/navigation";
import NextLink from "next/link";
import { Flex, Navbar, Headline, Link, Sidebar } from "@raystack/apsara";
import { RectangleStackIcon } from "@heroicons/react/24/outline";
import { ClientThemeSwitcher } from "../../components/ui/client-theme-switcher";
import { Search } from "../../components/ui/search";
import { Footer } from "../../components/ui/footer";
import { MethodBadge } from "../../components/api/method-badge";
import type { ThemeLayoutProps, PageTreeItem } from "../../types";
import styles from "./Layout.module.css";

const iconMap: Record<string, React.ReactNode> = {
  "rectangle-stack": <RectangleStackIcon width={16} height={16} />,
  "method-get": <MethodBadge method="GET" />,
  "method-post": <MethodBadge method="POST" />,
  "method-put": <MethodBadge method="PUT" />,
  "method-delete": <MethodBadge method="DELETE" />,
  "method-patch": <MethodBadge method="PATCH" />,
};

export function Layout({ children, config, tree }: ThemeLayoutProps) {
  const pathname = usePathname();
  console.log(config);
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
          {config.search?.enabled && <Search />}
          <ClientThemeSwitcher size={16} />
        </Navbar.End>
      </Navbar>
      <Flex className={styles.body}>
        <Sidebar defaultOpen collapsible={false} className={styles.sidebar}>
          <Sidebar.Main>
            {tree.children.map((item) => (
              <SidebarNode
                key={item.url ?? item.name}
                item={item}
                pathname={pathname}
              />
            ))}
          </Sidebar.Main>
        </Sidebar>
        <main className={styles.content}>{children}</main>
      </Flex>
      <Footer config={config.footer} />
    </Flex>
  );
}

function SidebarNode({
  item,
  pathname,
}: {
  item: PageTreeItem;
  pathname: string;
}) {
  if (item.type === "separator") {
    return null;
  }

  if (item.type === "folder" && item.children) {
    return (
      <Sidebar.Group
        label={item.name}
        leadingIcon={item.icon ? iconMap[item.icon] : undefined}
        classNames={{ items: styles.groupItems }}
      >
        {item.children.map((child) => (
          <SidebarNode
            key={child.url ?? child.name}
            item={child}
            pathname={pathname}
          />
        ))}
      </Sidebar.Group>
    );
  }

  const isActive = pathname === item.url;

  return (
    <Sidebar.Item
      href={item.url ?? "#"}
      active={isActive}
      leadingIcon={item.icon ? iconMap[item.icon] : undefined}
      as={<NextLink href={item.url ?? "#"} />}
    >
      {item.name}
    </Sidebar.Item>
  );
}
