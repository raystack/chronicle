'use client';

import { AnchorProvider, useActiveAnchor } from 'fumadocs-core/toc';
import type { TableOfContents, TOCItemType } from 'fumadocs-core/toc';
import { cx } from 'class-variance-authority';
import { isValidElement, type ReactNode } from 'react';
import styles from './Page.module.css';

function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

export function PageNav({ items }: { items: TableOfContents }) {
  const headings = items.filter(item => item.depth >= 2 && item.depth <= 3);

  return (
    <AnchorProvider toc={headings} single>
      <aside className={styles.pageNav} aria-label='On this page'>
        {headings.length > 0 ? <Headings items={headings} /> : null}
      </aside>
    </AnchorProvider>
  );
}

function Headings({ items }: { items: TOCItemType[] }) {
  const active = useActiveAnchor();

  return (
    <nav>
      <div className={styles.pageNavLabel}>On this page</div>
      {items.map(item => {
        const id = item.url.replace('#', '');
        const text = nodeToText(item.title);
        return (
          <a
            key={item.url}
            href={item.url}
            className={cx(
              styles.pageNavItem,
              item.depth > 2 && styles.pageNavItemNested
            )}
            data-active={active === id}
            title={text}
          >
            <span className={styles.pageNavItemText}>{text}</span>
          </a>
        );
      })}
    </nav>
  );
}

