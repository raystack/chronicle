'use client';

import { Flex } from '@raystack/apsara';
import type { ThemePageProps } from '@/types';
import styles from './Page.module.css';
import { Toc } from './Toc';

export function Page({ page }: ThemePageProps) {
  return (
    <Flex className={styles.page}>
      <article className={styles.article} data-article-content>
        <div className={styles.content}>{page.content}</div>
      </article>
      <Toc items={page.toc} />
    </Flex>
  );
}
