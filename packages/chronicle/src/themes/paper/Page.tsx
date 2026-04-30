import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { IconButton } from '@raystack/apsara';
import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';
import { flattenTree } from 'fumadocs-core/page-tree';
import type { ThemePageProps } from '@/types';
import styles from './Page.module.css';
import { ReadingProgress } from './ReadingProgress';

export function Page({ page, tree }: ThemePageProps) {
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
        <div className={styles.navbar}>
          <div className={styles.navLeft}>
            <div className={styles.arrows}>
              {prev ? (
                <RouterLink to={prev.url} aria-label='Previous page'>
                  <IconButton size={2}>
                    <ArrowLeftIcon width={14} height={14} />
                  </IconButton>
                </RouterLink>
              ) : (
                <IconButton size={2} disabled>
                  <ArrowLeftIcon width={14} height={14} />
                </IconButton>
              )}
              {next ? (
                <RouterLink to={next.url} aria-label='Next page'>
                  <IconButton size={2}>
                    <ArrowRightIcon width={14} height={14} />
                  </IconButton>
                </RouterLink>
              ) : (
                <IconButton size={2} disabled>
                  <ArrowRightIcon width={14} height={14} />
                </IconButton>
              )}
            </div>
            <nav className={styles.breadcrumb}>
              {crumbs.map((crumb, i) => (
                <span key={crumb.href}>
                  {i > 0 && <ChevronRightIcon width={12} height={12} className={styles.separator} />}
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
          </div>
          <div className={styles.navRight}>
            <IconButton size={2}>
              <AdjustmentsHorizontalIcon width={14} height={14} />
            </IconButton>
          </div>
        </div>
        <article className={styles.article} data-article-content>
          <div className={styles.content}>{page.content}</div>
        </article>
      </main>
      <ReadingProgress items={page.toc} />
    </>
  );
}
