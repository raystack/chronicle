'use client';

import { Text } from '@raystack/apsara';
import { AnchorProvider, useActiveAnchor } from 'fumadocs-core/toc';
import type { TableOfContents, TOCItemType } from 'fumadocs-core/toc';
import styles from './Toc.module.css';

interface TocProps {
  items: TableOfContents;
}

export function Toc({ items }: TocProps) {
  const filteredItems = items.filter(
    item => item.depth >= 2 && item.depth <= 3
  );

  if (filteredItems.length === 0) return null;

  return (
    <AnchorProvider toc={filteredItems} single>
      <TocContent items={filteredItems} />
    </AnchorProvider>
  );
}

function TocContent({ items }: { items: TOCItemType[] }) {
  const activeAnchor = useActiveAnchor();

  return (
    <aside className={styles.toc}>
      <Text size={1} weight='medium' className={styles.title}>
        On this page
      </Text>
      <nav className={styles.nav}>
        {items.map(item => {
          const id = item.url.replace('#', '');
          const isActive = activeAnchor === id;
          const isNested = item.depth > 2;
          return (
            <a
              key={item.url}
              href={item.url}
              className={`${styles.link} ${isActive ? styles.active : ''} ${isNested ? styles.nested : ''}`}
            >
              {item.title}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
