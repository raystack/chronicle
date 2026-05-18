'use client';

import { Flex, Headline } from '@raystack/apsara';
import { lazy, Suspense } from 'react';
import type { ThemePageProps } from '@/types';
import styles from './Page.module.css';

const Toc = lazy(() => import('./Toc').then(m => ({ default: m.Toc })));

export function Page({ page }: ThemePageProps) {
  return (
    <Flex className={styles.page}>
      <article className={styles.article} data-article-content>
        {page.frontmatter.title && (
          <Headline size="t2" render={<h1 />} className={styles.title}>
            {page.frontmatter.title}
          </Headline>
        )}
        <div className={styles.content}>{page.content}</div>
      </article>
      <Suspense fallback={null}>
        <Toc items={page.toc} />
      </Suspense>
    </Flex>
  );
}
