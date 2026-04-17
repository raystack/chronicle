'use client';

import { Bars3BottomLeftIcon } from '@heroicons/react/24/outline';
import { AnchorProvider, useActiveAnchor } from 'fumadocs-core/toc';
import type { TableOfContents, TOCItemType } from 'fumadocs-core/toc';
import { cx } from 'class-variance-authority';
import { isValidElement, type ReactNode } from 'react';
import styles from './Toc.module.css';

function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement(node)) {
    const children = (node.props as { children?: ReactNode }).children;
    return nodeToText(children);
  }
  return '';
}

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

const MARKER_BASE = 8;
const MARKER_PER_CHAR = 1;
const MARKER_MAX = 40;

function markerWidth(title: ReactNode): number {
  const len = nodeToText(title).length;
  return Math.min(MARKER_MAX, MARKER_BASE + len * MARKER_PER_CHAR);
}

function TocContent({ items }: { items: TOCItemType[] }) {
  const activeAnchor = useActiveAnchor();

  return (
    <aside className={styles.toc} aria-label='Table of contents'>
      <div className={styles.markers}>
        {items.map(item => {
          const id = item.url.replace('#', '');
          const isActive = activeAnchor === id;
          return (
            <a
              key={item.url}
              href={item.url}
              aria-label={nodeToText(item.title)}
              className={cx(styles.marker, isActive && styles.markerActive)}
              style={{ width: `${markerWidth(item.title)}px` }}
            >
              <span />
            </a>
          );
        })}
      </div>
      <div className={styles.panel} role='presentation'>
        <div className={styles.panelHeader}>
          <Bars3BottomLeftIcon width={16} height={16} />
          <span className={styles.panelHeaderLabel}>On this page</span>
        </div>
        <nav className={styles.panelList}>
          {items.map(item => {
            const id = item.url.replace('#', '');
            const isActive = activeAnchor === id;
            const isNested = item.depth > 2;
            return (
              <a
                key={item.url}
                href={item.url}
                className={cx(
                  styles.panelItem,
                  isNested && styles.panelItemNested,
                  isActive && styles.panelItemActive
                )}
              >
                {nodeToText(item.title)}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
