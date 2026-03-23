import { RectangleStackIcon } from '@heroicons/react/24/outline';
import {
  Button,
  Flex,
  Headline,
  Link,
  Navbar,
  Sidebar
} from '@raystack/apsara';
import { cx } from 'class-variance-authority';
import { useEffect, useMemo, useRef } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { MethodBadge } from '@/components/api/method-badge';
import { ClientThemeSwitcher } from '@/components/ui/client-theme-switcher';
import { Footer } from '@/components/ui/footer';
import { Search } from '@/components/ui/search';
import type { Node } from 'fumadocs-core/page-tree';
import type { ThemeLayoutProps } from '@/types';
import styles from './Layout.module.css';

const iconMap: Record<string, React.ReactNode> = {
  'rectangle-stack': <RectangleStackIcon width={16} height={16} />,
  'method-get': <MethodBadge method='GET' size='micro' />,
  'method-post': <MethodBadge method='POST' size='micro' />,
  'method-put': <MethodBadge method='PUT' size='micro' />,
  'method-delete': <MethodBadge method='DELETE' size='micro' />,
  'method-patch': <MethodBadge method='PATCH' size='micro' />
};

let savedScrollTop = 0;

export function Layout({
  children,
  config,
  tree,
  classNames
}: ThemeLayoutProps) {
  const { pathname } = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      savedScrollTop = el.scrollTop;
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el)
      requestAnimationFrame(() => {
        el.scrollTop = savedScrollTop;
      });
  }, [pathname]);

  return (
    <Flex direction='column' className={cx(styles.layout, classNames?.layout)}>
      <Navbar className={styles.header}>
        <Navbar.Start>
          <RouterLink
            to='/'
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Headline size='small' weight='medium' as='h1'>
              {config.title}
            </Headline>
          </RouterLink>
        </Navbar.Start>
        <Navbar.End>
          <Flex gap='medium' align='center' className={styles.navActions}>
            {config.api?.map(api => (
              <RouterLink
                key={api.basePath}
                to={api.basePath}
                className={styles.navButton}
              >
                {api.name} API
              </RouterLink>
            ))}
            {config.navigation?.links?.map(link => (
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
        <Sidebar
          defaultOpen
          collapsible={false}
          className={cx(styles.sidebar, classNames?.sidebar)}
        >
          <Sidebar.Main ref={scrollRef}>
            {tree.children.map((item, i) => (
              <SidebarNode
                key={item.type === 'page' ? item.url : (item.name?.toString() ?? i)}
                item={item}
                pathname={pathname}
              />
            ))}
          </Sidebar.Main>
        </Sidebar>
        <main className={cx(styles.content, classNames?.content)}>
          {children}
        </main>
      </Flex>
      <Footer config={config.footer} />
    </Flex>
  );
}

function SidebarNode({
  item,
  pathname
}: {
  item: Node;
  pathname: string;
}) {
  if (item.type === 'separator') {
    return null;
  }

  if (item.type === 'folder') {
    const icon = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon;
    return (
      <Sidebar.Group
        label={item.name?.toString() ?? ''}
        leadingIcon={icon ?? undefined}
        classNames={{ items: styles.groupItems }}
      >
        {item.children.map((child, i) => (
          <SidebarNode
            key={child.type === 'page' ? child.url : (child.name?.toString() ?? i)}
            item={child}
            pathname={pathname}
          />
        ))}
      </Sidebar.Group>
    );
  }

  const isActive = pathname === item.url;
  const href = item.url ?? '#';
  const icon = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon;
  const link = useMemo(() => <RouterLink to={href} />, [href]);

  return (
    <Sidebar.Item
      href={href}
      active={isActive}
      leadingIcon={icon ?? undefined}
      as={link}
    >
      {item.name}
    </Sidebar.Item>
  );
}
