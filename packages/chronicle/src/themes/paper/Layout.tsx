'use client';

import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Flex, Select, Text } from '@raystack/apsara';
import { cx } from 'class-variance-authority';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ClientThemeSwitcher } from '@/components/ui/client-theme-switcher';
import { SidebarLinks } from '@/components/ui/sidebar-links';
import { getLandingEntries } from '@/lib/config';
import { getActiveContentDir } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';
import type { ThemeLayoutProps } from '@/types';
import { ChapterNav } from './ChapterNav';
import styles from './Layout.module.css';
import { ReaderModeProvider, useReaderMode } from './ReaderModeContext';
import { VersionSwitcher } from './VersionSwitcher';

function SidebarHeader({ config }: { config: ThemeLayoutProps['config'] }) {
  const { version } = usePageContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const entries = getLandingEntries(config, version.dir);

  if (entries.length <= 1) {
    return (
      <Text size={2} weight={500} className={styles.title}>
        {config.site.title}
      </Text>
    );
  }

  const activeDir = getActiveContentDir(pathname, config);
  const activeEntry =
    entries.find(e => e.contentDir === activeDir) ?? entries[0];

  return (
    <Select
      value={activeEntry.contentDir}
      onValueChange={(val: string) => {
        const entry = entries.find(e => e.contentDir === val);
        if (entry) navigate(entry.href);
      }}
    >
      <Select.Trigger size='small' className={styles.contentDirTrigger}>
        <Select.Value placeholder={activeEntry.label} className={styles.title} />
      </Select.Trigger>
      <Select.Content>
        {entries.map(entry => (
          <Select.Item key={entry.href} value={entry.contentDir}>
            {entry.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
}

function LayoutInner({
  children,
  config,
  tree,
  hideSidebar,
  classNames
}: ThemeLayoutProps) {
  const { readerMode } = useReaderMode();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showSidebar = !hideSidebar && !readerMode;
  const showNavFooter = Boolean(
    config.versions?.length || config.latest?.label || config.links?.length
  );

  // Navigating from inside the menu should reveal the page, not leave the
  // full-screen overlay covering it. `pathname` is the effect's trigger rather
  // than a value the body reads, so the exhaustive-deps check misreads it as
  // surplus — dropping it, as its unsafe autofix suggests, would turn this into
  // a mount-only effect and the menu would never close.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <Flex direction='column' className={cx(styles.layout, classNames?.layout)}>
      {showSidebar ? (
        <>
          <div className={styles.mobileHeader}>
            <div className={styles.mobileHeaderTitle}>
              <SidebarHeader config={config} />
            </div>
            <Flex align='center' gap={3} className={styles.mobileHeaderActions}>
              <ClientThemeSwitcher size={16} />
              <button
                type='button'
                className={styles.mobileMenuBtn}
                onClick={() => setMobileMenuOpen(o => !o)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls='paper-mobile-menu'
              >
                {mobileMenuOpen
                  ? <XMarkIcon width={16} height={16} />
                  : <Bars3Icon width={16} height={16} />}
              </button>
            </Flex>
          </div>
          <div
            id='paper-mobile-menu'
            className={styles.mobileMenu}
            data-open={mobileMenuOpen}
          >
            <ChapterNav tree={tree} />
            {showNavFooter ? (
              <div className={styles.mobileMenuFooter}>
                <SidebarLinks variant='list' />
                <VersionSwitcher />
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      <Flex className={cx(styles.body, classNames?.body)}>
        {showSidebar ? (
          <aside className={cx(styles.sidebar, classNames?.sidebar)}>
            <div className={styles.header}>
              <SidebarHeader config={config} />
            </div>
            <div className={styles.navScroll}>
              <ChapterNav tree={tree} />
            </div>
            {showNavFooter ? (
              <div className={styles.footer}>
                <VersionSwitcher />
                <SidebarLinks />
              </div>
            ) : null}
          </aside>
        ) : null}
        <div className={cx(styles.content, classNames?.content, { [styles.contentFull]: !showSidebar })}>
          {children}
        </div>
      </Flex>
    </Flex>
  );
}

export function Layout(props: ThemeLayoutProps) {
  return (
    <ReaderModeProvider>
      <LayoutInner {...props} />
    </ReaderModeProvider>
  );
}
