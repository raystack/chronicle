"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import NextLink from "next/link";
import { cx } from "class-variance-authority";
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
  "method-get": <MethodBadge method="GET" size="micro" />,
  "method-post": <MethodBadge method="POST" size="micro" />,
  "method-put": <MethodBadge method="PUT" size="micro" />,
  "method-delete": <MethodBadge method="DELETE" size="micro" />,
  "method-patch": <MethodBadge method="PATCH" size="micro" />,
};

export function Layout({ children, config, tree, classNames }: ThemeLayoutProps) {
  const pathname = usePathname();
  return (
    <Flex direction="column" className={cx(styles.layout, classNames?.layout)}>
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
      <Flex className={cx(styles.body, classNames?.body)}>
        <Sidebar defaultOpen collapsible={false} className={cx(styles.sidebar, classNames?.sidebar)}>
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
        <main className={cx(styles.content, classNames?.content)}>{children}</main>
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
  const href = item.url ?? "#";
  const link = useMemo(() => <NextLink href={href} />, [href]);

  return (
    <Sidebar.Item
      href={href}
      active={isActive}
      leadingIcon={item.icon ? iconMap[item.icon] : undefined}
      as={link}
    >
      {item.name}
    </Sidebar.Item>
  );
}
