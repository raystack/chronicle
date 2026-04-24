import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CodeBracketSquareIcon,
  RectangleStackIcon,
  DocumentTextIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { Flex, IconButton, Sidebar } from '@raystack/apsara';
import { cx } from 'class-variance-authority';
import { useEffect, useMemo, useRef } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import { MethodBadge } from '@/components/api/method-badge';
import { ClientThemeSwitcher } from '@/components/ui/client-theme-switcher';
import { Search } from '@/components/ui/search';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getLandingEntries } from '@/lib/config';
import { getActiveContentDir } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';
import type { Node } from 'fumadocs-core/page-tree';
import type { ThemeLayoutProps } from '@/types';
import styles from './Layout.module.css';
import { OpenInAI } from './OpenInAI';
import { SidebarLogo } from './SidebarLogo';
import { VersionSwitcher } from './VersionSwitcher';

const iconMap: Record<string, React.ReactNode> = {
  'rectangle-stack': <RectangleStackIcon width={16} height={16} />,
  'method-get': <MethodBadge method='GET' size='micro' />,
  'method-post': <MethodBadge method='POST' size='micro' />,
  'method-put': <MethodBadge method='PUT' size='micro' />,
  'method-delete': <MethodBadge method='DELETE' size='micro' />,
  'method-patch': <MethodBadge method='PATCH' size='micro' />
};

function renderConfigIcon(
  icon: string | undefined,
  alt: string,
  fallback: React.ReactNode
): React.ReactNode {
  if (!icon) return fallback;
  if (icon.trim().startsWith('<svg')) {
    return (
      <span
        aria-label={alt}
        className={styles.configIcon}
        dangerouslySetInnerHTML={{ __html: icon }}
      />
    );
  }
  return <img src={icon} alt={alt} className={styles.configIcon} />;
}

let savedScrollTop = 0;

export function Layout({
  children,
  config,
  tree,
  hideSidebar,
  classNames
}: ThemeLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { page, version } = usePageContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isApiRoute = pathname.startsWith('/apis');
  const isApiBase = (basePath: string) =>
    pathname === basePath || pathname.startsWith(`${basePath}/`);
  const { prev, next } = page ?? { prev: null, next: null };

  const contentEntries = getLandingEntries(config, version.dir);
  const activeContentDir = getActiveContentDir(pathname, config);
  const apiEntries = config.api ?? [];
  const showTopLinks = contentEntries.length + apiEntries.length > 1;

  const slug = useMemo(
    () => (pathname === '/' ? [] : pathname.split('/').filter(Boolean)),
    [pathname]
  );

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
      <Flex className={cx(styles.body, classNames?.body)}>
        {hideSidebar ? null : (
          <Sidebar
            defaultOpen
            collapsible={false}
            className={cx(styles.sidebar, classNames?.sidebar)}
          >
            <Sidebar.Header className={styles.sidebarHeader}>
              <SidebarLogo config={config} />
              <Flex gap='small' align='center'>
                {config.search?.enabled && <Search />}
                <ClientThemeSwitcher size={16} />
              </Flex>
            </Sidebar.Header>
            <Sidebar.Main ref={scrollRef} className={styles.sidebarMain}>
              {showTopLinks ? (
                <div className={styles.topLinks}>
                  {contentEntries.map(entry => (
                    <Sidebar.Item
                      key={entry.href}
                      href={entry.href}
                      active={activeContentDir === entry.contentDir}
                      leadingIcon={renderConfigIcon(
                        entry.icon,
                        entry.label,
                        <DocumentTextIcon width={16} height={16} />
                      )}
                      classNames={{ root: styles.topLinkItem, text: styles.topLinkText }}
                      render={<RouterLink to={entry.href} />}
                    >
                      {entry.label}
                    </Sidebar.Item>
                  ))}
                  {apiEntries.map(api => (
                    <Sidebar.Item
                      key={api.basePath}
                      href={api.basePath}
                      active={isApiBase(api.basePath)}
                      leadingIcon={renderConfigIcon(
                        api.icon,
                        api.name,
                        <CodeBracketSquareIcon width={16} height={16} />
                      )}
                      classNames={{ root: styles.topLinkItem, text: styles.topLinkText }}
                      render={<RouterLink to={api.basePath} />}
                    >
                      {api.name} API
                    </Sidebar.Item>
                  ))}
                </div>
              ) : null}
              {tree.children.map((item, i) => (
                <SidebarNode
                  key={item.type === 'page' ? item.url : (item.name?.toString() ?? i)}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </Sidebar.Main>
            {config.versions?.length ? (
              <Sidebar.Footer className={styles.sidebarFooter}>
                <VersionSwitcher />
              </Sidebar.Footer>
            ) : null}
          </Sidebar>
        )}
        <Flex direction='column' className={styles.mainArea}>
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <nav className={styles.subNav}>
                <Flex align='center' gap='small' className={styles.subNavLeft}>
                  <Flex align='center' gap='extra-small'>
                    <IconButton
                      size={2}
                      disabled={!prev}
                      onClick={() => prev && navigate(prev.url)}
                      aria-label='Previous page'
                    >
                      <ArrowLeftIcon width={14} height={14} />
                    </IconButton>
                    <IconButton
                      size={2}
                      disabled={!next}
                      onClick={() => next && navigate(next.url)}
                      aria-label='Next page'
                    >
                      <ArrowRightIcon width={14} height={14} />
                    </IconButton>
                  </Flex>
                  {!isApiRoute && <Breadcrumbs slug={slug} tree={tree} />}
                </Flex>
                <OpenInAI />
              </nav>
              <main className={cx(styles.content, classNames?.content)}>
                {children}
              </main>
            </div>
          </div>
        </Flex>
      </Flex>
    </Flex>
  );
}

function SidebarNode({
  item,
  pathname,
  depth = 0
}: {
  item: Node;
  pathname: string;
  depth?: number;
}) {
  if (item.type === 'separator') {
    return null;
  }

  if (item.type === 'folder') {
    if (depth > 1) return null;
    const icon = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon;
    return (
      <Sidebar.Group
        className={styles.navGroup}
        data-depth={depth}
        label={item.name?.toString() ?? ''}
        leadingIcon={icon ?? undefined}
        collapsible={depth === 1}
        classNames={{
          items: styles.groupItems,
          header: styles.navGroupHeader,
          trigger: styles.navGroupTrigger,
          label: styles.navGroupLabel,
          chevron: styles.navGroupChevron,
        }}
      >
        {item.children.map((child, i) => (
          <SidebarNode
            key={child.type === 'page' ? child.url : (child.name?.toString() ?? i)}
            item={child}
            pathname={pathname}
            depth={depth + 1}
          />
        ))}
      </Sidebar.Group>
    );
  }

  const isActive = pathname === item.url;
  const href = item.url ?? '#';
  const icon = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon;
  const link = <RouterLink to={href} />;

  return (
    <Sidebar.Item
      href={href}
      active={isActive}
      leadingIcon={icon ?? undefined}
      render={link}
    >
      {item.name}
    </Sidebar.Item>
  );
}
