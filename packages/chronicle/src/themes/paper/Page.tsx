import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Flex } from '@raystack/apsara';
import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';
import { flattenTree } from 'fumadocs-core/page-tree';
import { Search } from '@/components/ui/search';
import type { ThemePageProps } from '@/types';
import styles from './Page.module.css';
import { ReadingProgress } from './ReadingProgress';

export function Page({ page, config, tree }: ThemePageProps) {
  const { pathname } = useLocation();

  const { prev, next, crumbs } = useMemo(() => {
    const pages = flattenTree(tree.children);
    const currentIndex = pages.findIndex(p => p.url === pathname);
    const breadcrumbItems = getBreadcrumbItems(
      pathname,
      tree,
      { includePage: true }
    );
    return {
      prev: currentIndex > 0 ? pages[currentIndex - 1] : null,
      next: currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null,
      crumbs: breadcrumbItems.map(item => ({
        label: item.name,
        href: item.url ?? pathname,
      })),
    };
  }, [tree, pathname]);

  return (
    <>
      <main className={styles.main}>
        <Flex align='center' className={styles.navbar}>
          <Flex align='center' gap='small' className={styles.navLeft}>
            {prev ? (
              <RouterLink
                to={prev.url}
                className={styles.arrow}
                aria-label='Previous page'
              >
                <ChevronLeftIcon width={14} height={14} />
              </RouterLink>
            ) : (
              <button
                disabled
                className={styles.arrowDisabled}
                aria-label='Previous page'
              >
                <ChevronLeftIcon width={14} height={14} />
              </button>
            )}
            {next ? (
              <RouterLink
                to={next.url}
                className={styles.arrow}
                aria-label='Next page'
              >
                <ChevronRightIcon width={14} height={14} />
              </RouterLink>
            ) : (
              <button
                disabled
                className={styles.arrowDisabled}
                aria-label='Next page'
              >
                <ChevronRightIcon width={14} height={14} />
              </button>
            )}
            <nav className={styles.breadcrumb}>
              {crumbs.map((crumb, i) => (
                <span key={crumb.href}>
                  {i > 0 && <span className={styles.separator}>/</span>}
                  {i === crumbs.length - 1 ? (
                    <span className={styles.crumbActive}>{crumb.label}</span>
                  ) : (
                    <RouterLink to={crumb.href} className={styles.crumbLink}>
                      {crumb.label}
                    </RouterLink>
                  )}
                </span>
              ))}
            </nav>
          </Flex>
          <Flex align='center' className={styles.navRight}>
            {config.search?.enabled && (
              <Search className={styles.searchButton} />
            )}
          </Flex>
        </Flex>
        <article className={styles.article} data-article-content>
          <div className={styles.content}>{page.content}</div>
        </article>
      </main>
      <ReadingProgress items={page.toc} />
    </>
  );
}
