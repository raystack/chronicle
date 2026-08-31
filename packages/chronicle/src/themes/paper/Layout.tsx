'use client';

import { Flex, Select, Text } from '@raystack/apsara';
import { cx } from 'class-variance-authority';
import { useLocation, useNavigate } from 'react-router';
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
  const showSidebar = !hideSidebar && !readerMode;

  return (
    <Flex direction='column' className={cx(styles.layout, classNames?.layout)}>
      <Flex className={cx(styles.body, classNames?.body)}>
        {showSidebar ? (
          <aside className={cx(styles.sidebar, classNames?.sidebar)}>
            <div className={styles.header}>
              <SidebarHeader config={config} />
            </div>
            <div className={styles.navScroll}>
              <ChapterNav tree={tree} />
            </div>
            {config.versions?.length || config.links?.length ? (
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
