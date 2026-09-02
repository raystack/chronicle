import { ApiIcon, ArrowLeftIcon, ArrowRightIcon, FileTextIcon, LayersIcon, MenuIcon, PlayIcon, XIcon } from '@/components/ui/icons';
import { Flex, IconButton, Button, Sidebar } from '@raystack/apsara';
import { cx } from 'class-variance-authority';
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import type { OpenAPIV3 } from 'openapi-types';
import { MethodBadge } from '@/components/api/method-badge';
import { useApiOperation } from '@/lib/use-api-operation';

const PlaygroundDialog = lazy(() => import('@/components/api/playground-dialog').then(m => ({ default: m.PlaygroundDialog })));
import { ClientThemeSwitcher } from '@/components/ui/client-theme-switcher';
import { Search } from '@/components/ui/search';
import { SidebarLinks } from '@/components/ui/sidebar-links';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getLandingEntries } from '@/lib/config';
import { getActiveContentDir } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';
import { isAuthorRoute, resolveRoute } from '@/lib/route-resolver';
import type { Node, Root } from 'fumadocs-core/page-tree';
import { NodeType } from '@/lib/tree-utils';
import type { ThemeLayoutProps } from '@/types';
import styles from './Layout.module.css';
import { OpenInAI } from './OpenInAI';
import { SidebarLogo } from './SidebarLogo';

import { VersionSwitcher } from './VersionSwitcher';

const MAX_SIDEBAR_DEPTH = 3;

const iconMap: Record<string, React.ReactNode> = {
  'rectangle-stack': <LayersIcon width={16} height={16} />,
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isApiRoute = pathname === '/apis' || pathname.startsWith('/apis/');
  // Author pages aren't MDX, so they have no `.md` for the AI menu to hand over.
  const isAuthorsRoute = isAuthorRoute(resolveRoute(pathname, config));
  const isApiBase = (basePath: string) =>
    pathname === basePath || pathname.startsWith(`${basePath}/`);
  const docNav = page ?? { prev: null, next: null };
  const apiNav = useMemo(() => {
    if (!isApiRoute) return { prev: null, next: null };
    return getApiPrevNext(pathname, tree);
  }, [isApiRoute, pathname, tree]);
  const { prev, next } = isApiRoute ? apiNav : docNav;

  const contentEntries = getLandingEntries(config, version.dir);
  const activeContentDir = getActiveContentDir(pathname, config);
  const apiEntries = config.api ?? [];
  const showTopLinks = contentEntries.length + apiEntries.length > 1;
  const showFooter = !!(
    config.versions?.length || config.latest?.label || config.links?.length
  );

  const slug = useMemo(
    () => (pathname === '/' ? [] : pathname.split('/').filter(Boolean)),
    [pathname]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = document.querySelector<HTMLElement>(`.${styles.sidebarMain}`);
      if (!container) return;
      const allActive = container.querySelectorAll<HTMLElement>('[data-active="true"]');
      const activeItem = allActive[allActive.length - 1];
      if (!activeItem) return;
      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
        container.scrollTop += itemRect.top - containerRect.top - containerRect.height / 2 + itemRect.height / 2;
      }
    }, 100);
    setMobileSidebarOpen(false);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <Flex direction='column' className={cx(styles.layout, classNames?.layout)}>
      <div className={styles.mobileHeader}>
        <SidebarLogo config={config} />
        <Flex align='center' gap={3}>
          {config.search?.enabled && <Search />}
          <ClientThemeSwitcher size={16} />
          {!hideSidebar && (
            <button
              type='button'
              className={styles.mobileMenuBtn}
              onClick={() => setMobileSidebarOpen(o => !o)}
              aria-label={mobileSidebarOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileSidebarOpen}
              aria-controls='mobile-menu'
            >
              {mobileSidebarOpen
                ? <XIcon width={16} height={16} />
                : <MenuIcon width={16} height={16} />}
            </button>
          )}
        </Flex>
      </div>
      <div id='mobile-menu' className={styles.mobileMenu} data-open={!hideSidebar && mobileSidebarOpen}>
        {showTopLinks ? (
          <div className={styles.topLinks}>
            {contentEntries.map(entry => (
              <Sidebar.Item
                key={entry.href}
                href={entry.href}
                active={activeContentDir === entry.contentDir}
                leadingIcon={renderConfigIcon(entry.icon, entry.label, <FileTextIcon width={16} height={16} />)}
                className={styles.topLinkItem}
                render={<RouterLink to={entry.href} />}
              >
                {entry.label}
              </Sidebar.Item>
            ))}
            {apiEntries.map(api => (
              <Sidebar.Item
                key={`${api.basePath}-${api.name}`}
                href={api.basePath}
                active={isApiBase(api.basePath)}
                leadingIcon={renderConfigIcon(api.icon, api.name, <ApiIcon width={16} height={16} />)}
                className={styles.topLinkItem}
                render={<RouterLink to={api.basePath} />}
              >
                {api.name} API
              </Sidebar.Item>
            ))}
          </div>
        ) : null}
        {tree.children.map((item, i) => (
          isApiRoute ? (
            <ApiSidebarNode
              key={item.type === 'page' ? item.url : (item.name?.toString() ?? i)}
              item={item}
              pathname={pathname}
            />
          ) : (
            <SidebarNode
              key={item.type === 'page' ? item.url : (item.name?.toString() ?? i)}
              item={item}
              pathname={pathname}
            />
          )
        ))}
        {showFooter ? (
          <div className={styles.mobileMenuFooter}>
            <SidebarLinks variant='list' />
            <VersionSwitcher />
          </div>
        ) : null}
      </div>
      <Flex className={cx(styles.body, classNames?.body)}>
        {hideSidebar ? null : (
          <Sidebar
            defaultOpen
            collapsible='none'
            className={cx(styles.sidebar, classNames?.sidebar)}
          >
            <Sidebar.Header className={styles.sidebarHeader}>
              <SidebarLogo config={config} />
              <Flex gap={3} align='center'>
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
                        <FileTextIcon width={16} height={16} />
                      )}
                      className={styles.topLinkItem}
                      render={<RouterLink to={entry.href} data-no-prefetch />}
                    >
                      {entry.label}
                    </Sidebar.Item>
                  ))}
                  {apiEntries.map(api => (
                    <Sidebar.Item
                      key={`${api.basePath}-${api.name}`}
                      href={api.basePath}
                      active={isApiBase(api.basePath)}
                      leadingIcon={renderConfigIcon(
                        api.icon,
                        api.name,
                        <ApiIcon width={16} height={16} />
                      )}
                      className={styles.topLinkItem}
                      render={<RouterLink to={api.basePath} data-no-prefetch />}
                    >
                      {api.name} API
                    </Sidebar.Item>
                  ))}
                </div>
              ) : null}
              {tree.children.map((item, i) => (
                isApiRoute ? (
                  <ApiSidebarNode
                    key={item.type === 'page' ? item.url : (item.name?.toString() ?? i)}
                    item={item}
                    pathname={pathname}
                  />
                ) : (
                  <SidebarNode
                    key={item.type === 'page' ? item.url : (item.name?.toString() ?? i)}
                    item={item}
                    pathname={pathname}
                  />
                )
              ))}
            </Sidebar.Main>
            {showFooter ? (
              <Sidebar.Footer
                className={styles.sidebarFooter}
                direction='row'
                align='center'
                justify='between'
              >
                <VersionSwitcher />
                <SidebarLinks />
              </Sidebar.Footer>
            ) : null}
          </Sidebar>
        )}
        <Flex direction='column' className={styles.mainArea}>
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <nav className={styles.subNav}>
                <Flex align='center' gap={3} className={styles.subNavLeft}>
                  <Flex align='center' gap={2}>
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
                  <Breadcrumbs slug={slug} tree={tree} />
                </Flex>
                <Flex align='center' gap={3}>
                  {isApiRoute && <TestRequestButton />}
                  {isApiRoute && <ViewDocsButton />}
                  {!isAuthorsRoute && <OpenInAI />}
                </Flex>
              </nav>
              <main className={cx(styles.content, classNames?.content)}>
                {children}
              </main>
              <div className={styles.mobileNav}>
                {prev ? (
                  <RouterLink to={prev.url} className={styles.mobileNavLink}>
                    <ArrowLeftIcon width={16} height={16} />
                    <span className={styles.mobileNavLabel}>{prev.title}</span>
                  </RouterLink>
                ) : <div />}
                {next ? (
                  <RouterLink to={next.url} className={styles.mobileNavLink} data-direction='next'>
                    <span className={styles.mobileNavLabel}>{next.title}</span>
                    <ArrowRightIcon width={16} height={16} />
                  </RouterLink>
                ) : <div />}
              </div>
            </div>
          </div>
        </Flex>
      </Flex>
    </Flex>
  );
}

function hasActiveDescendant(node: Node, pathname: string): boolean {
  if (node.type === NodeType.Page) return pathname === node.url;
  if (node.type === NodeType.Folder) {
    if (node.index && pathname === node.index.url) return true;
    return node.children.some(child => hasActiveDescendant(child, pathname));
  }
  return false;
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
    if (depth > MAX_SIDEBAR_DEPTH) return null;
    const icon = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon;
    const hasActiveChild = hasActiveDescendant(item, pathname);
    return (
      <Sidebar.Group
        className={styles.navGroup}
        data-depth={depth}
        label={item.name?.toString() ?? ''}
        leadingIcon={icon ?? undefined}
        collapsible={depth >= 1}
        defaultOpen={hasActiveChild}
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

const methodColorMap: Record<string, string> = {
  'method-get': 'var(--rs-color-foreground-success-primary)',
  'method-post': 'var(--rs-color-foreground-accent-primary)',
  'method-put': 'var(--rs-color-foreground-attention-primary)',
  'method-delete': 'var(--rs-color-foreground-danger-primary)',
  'method-patch': 'var(--rs-color-foreground-base-secondary)',
};

const methodLabelMap: Record<string, string> = {
  'method-get': 'GET',
  'method-post': 'POST',
  'method-put': 'PUT',
  'method-delete': 'DEL',
  'method-patch': 'PATCH',
};

function ApiSidebarNode({ item, pathname }: { item: Node; pathname: string }) {
  if (item.type === 'separator') return null;

  if (item.type === 'folder') {
    return (
      <Flex direction='column' gap={3} className={styles.apiGroup}>
        <span className={styles.apiGroupLabel}>{item.name?.toString()}</span>
        <Flex direction='column'>
          {item.children.map((child, i) => (
            <ApiSidebarNode
              key={child.type === 'page' ? child.url : (child.name?.toString() ?? i)}
              item={child}
              pathname={pathname}
            />
          ))}
        </Flex>
      </Flex>
    );
  }

  const isActive = pathname === item.url;
  const href = item.url ?? '#';
  const iconKey = typeof item.icon === 'string' ? item.icon : '';
  const methodLabel = methodLabelMap[iconKey];
  const methodColor = methodColorMap[iconKey];

  return (
    <Flex
      align='center'
      gap={3}
      className={`${styles.apiItem} ${isActive ? styles.apiItemActive : ''}`}
      data-active={isActive}
      render={<RouterLink to={href} />}
    >
      <span className={styles.apiItemName}>{item.name}</span>
      {methodLabel && (
        <span className={styles.apiMethodText} style={{ color: methodColor }}>
          {methodLabel}
        </span>
      )}
    </Flex>
  );
}

function TestRequestButton() {
  const match = useApiOperation();
  const [open, setOpen] = useState(false);
  if (!match) return null;

  return (
    <>
      <Button
        variant='outline'
        color='neutral'
        size='small'
        leadingIcon={<PlayIcon width={12} height={12} />}
        onClick={() => setOpen(true)}
      >
        Test request
      </Button>
      {open && (
        <Suspense fallback={null}>
          <PlaygroundDialog
            key={`${match.spec.name}-${match.path}-${match.method}`}
            open={open}
            onOpenChange={setOpen}
            method={match.method}
            path={match.path}
            operation={match.operation}
            serverUrl={match.spec.server.url}
            specName={match.spec.name}
            auth={match.spec.auth}
            document={match.spec.document}
          />
        </Suspense>
      )}
    </>
  );
}

function ViewDocsButton() {
  const match = useApiOperation();
  if (!match) return null;

  const operation = match.operation as OpenAPIV3.OperationObject;
  const docsUrl = operation.externalDocs?.url ?? match.spec.document.externalDocs?.url;
  if (!docsUrl) return null;

  return (
    <Button
      variant='outline'
      color='neutral'
      size='small'
      leadingIcon={<FileTextIcon width={12} height={12} />}
      onClick={() => window.open(docsUrl, '_blank', 'noopener,noreferrer')}
    >
      View documentation
    </Button>
  );
}

function getApiPrevNext(pathname: string, tree: Root): { prev: { url: string; title: string } | null; next: { url: string; title: string } | null } {
  const pages: { url: string; title: string }[] = [];
  function collect(node: Node) {
    if (node.type === 'page') {
      pages.push({ url: node.url, title: node.name?.toString() ?? '' });
    } else if (node.type === 'folder') {
      for (const child of node.children) collect(child);
    }
  }
  for (const child of tree.children) collect(child);

  const idx = pages.findIndex(p => p.url === pathname);
  return {
    prev: idx > 0 ? pages[idx - 1] : null,
    next: idx >= 0 && idx < pages.length - 1 ? pages[idx + 1] : null,
  };
}
