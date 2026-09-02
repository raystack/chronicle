'use client';

import { MenuIcon, XIcon } from '@/components/ui/icons';
import { useTheme } from '@raystack/apsara';
import { cx } from 'class-variance-authority';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { useSearch } from '@/components/ui/search';
import { SidebarLinks } from '@/components/ui/sidebar-links';
import {
  getAllVersions,
  getApiConfigsForVersion,
  getLandingEntries
} from '@/lib/config';
import { getActiveContentDir, getVersionHomeHref } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';
import { RouteType, resolveRoute } from '@/lib/route-resolver';
import type { ThemeLayoutProps } from '@/types';
import styles from './Layout.module.css';
import { Nav } from './Nav';

/**
 * Doto and Geist Mono, requested from the document rather than with an `@import`
 * in the stylesheet.
 *
 * `registry.ts` imports every theme statically, so an `@import` here was hoisted
 * into the one bundled stylesheet and every Chronicle site fetched these two
 * families — including sites running a different theme that never renders them.
 * React hoists and deduplicates a `<link>` rendered anywhere in the tree, so
 * this loads only while this layout is mounted.
 */
const WEB_FONTS =
  'https://fonts.googleapis.com/css2?family=Doto:wght@400;700;800&family=Geist+Mono:wght@400;500;700&display=swap';

/**
 * `navigation.links` and `navigation.social` for the left rail.
 *
 * `config.links` is deliberately not here: `SidebarLinks` owns those, and it
 * adds UTM parameters, routes relative hrefs through the router instead of
 * reloading the document, and opens external ones with `noopener` alone so the
 * destination still sees this site as the referrer. Re-emitting them as plain
 * anchors threw all of that away.
 *
 * `navigation.social` often points at the same repository as a
 * `navigation.links` entry, so the list is deduplicated by destination — the
 * first spelling of a URL wins.
 */
function useRailLinks() {
  const { config } = usePageContext();
  const all = [
    ...(config.navigation?.links ?? []),
    ...(config.navigation?.social ?? []).map(s => ({
      label: s.type,
      href: s.href
    }))
  ];
  const seen = new Set<string>();
  return all.filter(link => {
    const key = link.href.replace(/\/+$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function Brand() {
  const { config, version } = usePageContext();
  const versions = getAllVersions(config);
  const active = versions.find(v =>
    v.isLatest ? version.dir === null : v.dir === version.dir
  );
  const label = active?.label ?? config.latest?.label;

  return (
    <RouterLink to={version.urlPrefix || '/'} className={styles.brand}>
      <span className={styles.brandName}>{config.site.title}</span>
      {label ? <span className={styles.brandVersion}>~/{label}</span> : null}
    </RouterLink>
  );
}

function SearchLine() {
  const { config } = usePageContext();
  const { setOpen } = useSearch();

  if (!config.search?.enabled) return null;

  return (
    <button type='button' className={styles.search} onClick={() => setOpen(true)}>
      <span>[ Search ]</span>
      <span className={styles.searchKey}>⌘K</span>
    </button>
  );
}

/**
 * The sections of the site — one row per content directory, plus any API. The
 * tree below only ever shows the section you are in, so this is what moves you
 * between them.
 */
function Switcher() {
  const { config, version } = usePageContext();
  const { pathname } = useLocation();

  const activeDir = getActiveContentDir(pathname, config);
  const docs = getLandingEntries(config, version.dir).map(entry => ({
    key: entry.contentDir,
    label: entry.label,
    href: entry.href,
    active: entry.contentDir === activeDir
  }));
  const apis = getApiConfigsForVersion(config, version.dir).map(api => ({
    key: api.basePath,
    label: api.name,
    href: api.basePath,
    active:
      pathname === api.basePath || pathname.startsWith(`${api.basePath}/`)
  }));

  const entries = [...docs, ...apis];
  // A single section has nowhere to switch to; the tree alone says where you are.
  if (entries.length < 2) return null;

  return (
    <nav className={styles.switcher} aria-label='Sections'>
      {entries.map(entry => (
        <RouterLink
          key={entry.key}
          to={entry.href}
          className={styles.switcherItem}
          data-active={entry.active}
          aria-current={entry.active ? 'true' : undefined}
        >
          {entry.label}
        </RouterLink>
      ))}
    </nav>
  );
}

/**
 * Rendered in the rail footer and again in the mobile header, where it is the
 * only way to reach the setting — the rail is not on screen at that width.
 * Mounts empty on the server: the resolved theme is not known until hydration,
 * and guessing it makes the label flip after paint.
 */
function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const next = resolvedTheme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type='button'
      className={cx(styles.iconButton, className)}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
    >
      {next === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}

function RailFooter() {
  const { config, version } = usePageContext();
  const links = useRailLinks();
  const versions = getAllVersions(config);

  const showVersions = versions.length > 1;
  if (!links.length && !showVersions && !config.links?.length) return null;

  return (
    <div className={styles.railFooter}>
      {showVersions
        ? versions.map(v => (
            <RouterLink
              key={v.dir ?? '_latest'}
              to={getVersionHomeHref(config, v.dir)}
              className={styles.railFooterLink}
              data-active={v.isLatest ? version.dir === null : v.dir === version.dir}
            >
              ~/{v.label}
            </RouterLink>
          ))
        : null}
      {links.map(link => (
        <a
          key={`${link.label}-${link.href}`}
          href={link.href}
          className={styles.railFooterLink}
          target={/^https?:/.test(link.href) ? '_blank' : undefined}
          rel={/^https?:/.test(link.href) ? 'noreferrer' : undefined}
        >
          {link.label}
        </a>
      ))}
      {config.links?.length ? (
        <div className={styles.railFooterLinks}>
          <SidebarLinks variant='list' />
        </div>
      ) : null}
      <ThemeToggle className={styles.railFooterToggle} />
    </div>
  );
}

export function Layout({
  children,
  config,
  tree,
  hideSidebar,
  classNames
}: ThemeLayoutProps) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * ApiLayout hands the theme a fixed-height, `overflow: hidden` shell and
   * expects the content column to be the scroller. That only works if a
   * definite height reaches it, so the wrappers in between opt into one — and
   * the page's top margin comes off, since the shell is exactly a viewport tall
   * and the margin would push its last 24px out of sight.
   */
  const routeType = resolveRoute(pathname, config).type;
  const isApiRoute =
    routeType === RouteType.ApiPage || routeType === RouteType.ApiIndex;

  // Navigating from inside the overlay should reveal the page rather than leave
  // the menu covering it. `pathname` is the trigger, not a value the body reads.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const showRail = !hideSidebar;

  return (
    <div
      className={cx(styles.layout, classNames?.layout)}
      data-api={isApiRoute || undefined}
    >
      <link rel='stylesheet' href={WEB_FONTS} />
      {/* The header itself is not gated on the rail. A landing or author page
          has no tree to show, but on a phone it still needs the site title, the
          search trigger and the theme toggle — only the menu button depends on
          there being a tree. */}
      <header className={styles.mobileHeader}>
        <Brand />
        <div className={styles.mobileActions}>
          <SearchLine />
          <ThemeToggle />
          {showRail ? (
            <button
              type='button'
              className={styles.iconButton}
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls='fanfold-menu'
            >
              {menuOpen ? (
                <XIcon width={16} height={16} />
              ) : (
                <MenuIcon width={16} height={16} />
              )}
            </button>
          ) : null}
        </div>
      </header>
      {showRail ? (
        <div id='fanfold-menu' className={styles.mobileMenu} data-open={menuOpen}>
          <Switcher />
          <div className={styles.separator} />
          <Nav tree={tree} />
          <RailFooter />
        </div>
      ) : null}
      <div className={styles.frame}>
        <div className={styles.strip} aria-hidden='true' />
        <div className={cx(styles.sheet, classNames?.body)}>
          {showRail ? (
            <aside className={cx(styles.rail, classNames?.sidebar)}>
              <Brand />
              <Switcher />
              <div className={styles.separator} />
              <Nav tree={tree} />
              <RailFooter />
            </aside>
          ) : null}
          <div
            className={cx(styles.content, classNames?.content, {
              [styles.contentFull]: !showRail
            })}
          >
            {children}
          </div>
        </div>
        <div className={styles.strip} aria-hidden='true' />
      </div>
    </div>
  );
}
