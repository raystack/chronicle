"use client";

import { useMemo, useEffect, useRef } from "react";
import { usePathname, Link as NextLink } from "@/lib/router";
import { cx } from "class-variance-authority";
import { Flex, Navbar, Headline, Link, Sidebar, Button } from "@raystack/apsara";
import { RectangleStackIcon } from "@heroicons/react/24/outline";
import { ClientThemeSwitcher } from "@/components/ui/client-theme-switcher";
import { Search } from "@/components/ui/search";
import { Footer } from "@/components/ui/footer";
import { MethodBadge } from "@/components/api/method-badge";
import type { ThemeLayoutProps, PageTreeItem } from "@/types";
import styles from "./Layout.module.css";

const iconMap: Record<string, React.ReactNode> = {
  "rectangle-stack": <RectangleStackIcon width={16} height={16} />,
  "method-get": <MethodBadge method="GET" size="micro" />,
  "method-post": <MethodBadge method="POST" size="micro" />,
  "method-put": <MethodBadge method="PUT" size="micro" />,
  "method-delete": <MethodBadge method="DELETE" size="micro" />,
  "method-patch": <MethodBadge method="PATCH" size="micro" />,
};

let savedScrollTop = 0;

export function Layout({ children, config, tree, classNames }: ThemeLayoutProps) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => { savedScrollTop = el.scrollTop; };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) requestAnimationFrame(() => { el.scrollTop = savedScrollTop; });
  }, [pathname]);

  return (
    <Flex direction="column" className={cx(styles.layout, classNames?.layout)}>
      <Navbar className={styles.header}>
        <Navbar.Start>
          <NextLink href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Headline size="small" weight="medium" as="h1">
              {config.title}
            </Headline>
          </NextLink>
        </Navbar.Start>
        <Navbar.End>
          <Flex gap="medium" align="center" className={styles.navActions}>
            {config.api?.map((api) => (
              <NextLink key={api.basePath} href={api.basePath} className={styles.navButton}>
                {api.name} API
              </NextLink>
            ))}
            {config.navigation?.links?.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            {config.search?.enabled && <Search />}
          </Flex>
          <ClientThemeSwitcher size={16} />
        </Navbar.End>
      </Navbar>
      <Flex className={cx(styles.body, classNames?.body)}>
        <Sidebar defaultOpen collapsible={false} className={cx(styles.sidebar, classNames?.sidebar)}>
          <Sidebar.Main ref={scrollRef}>
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
  const link = useMemo(() => <NextLink href={href} scroll={false} />, [href]);

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
