'use client';

import { Flex, Headline } from '@raystack/apsara';
import { cx } from 'class-variance-authority';
import { Footer } from '@/components/ui/footer';
import type { ThemeLayoutProps } from '@/types';
import { ChapterNav } from './ChapterNav';
import { ContentDirDropdown } from './ContentDirDropdown';
import styles from './Layout.module.css';
import { VersionSwitcher } from './VersionSwitcher';

export function Layout({
  children,
  config,
  tree,
  hideSidebar,
  classNames
}: ThemeLayoutProps) {
  return (
    <Flex direction='column' className={cx(styles.layout, classNames?.layout)}>
      <Flex className={cx(styles.body, classNames?.body)}>
        {hideSidebar ? null : (
          <aside className={cx(styles.sidebar, classNames?.sidebar)}>
            <Headline
              size='small'
              weight='medium'
              as='h1'
              className={styles.title}
            >
              {config.site.title}
            </Headline>
            <div className={styles.nav}>
              <VersionSwitcher />
              <ContentDirDropdown />
            </div>
            <ChapterNav tree={tree} />
          </aside>
        )}
        <div className={cx(styles.content, classNames?.content)}>
          {children}
        </div>
      </Flex>
      <Footer config={config.footer} />
    </Flex>
  );
}
