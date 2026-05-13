'use client';

import { Flex, Headline } from '@raystack/apsara';
import type { ThemePageProps } from '@/types';
import styles from './Page.module.css';
import { Toc } from './Toc';

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
      <Toc items={page.toc} />
    </Flex>
  );
}
