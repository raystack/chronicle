import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  SunIcon,
  MoonIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { IconButton, useTheme } from '@raystack/apsara';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';
import { flattenTree } from 'fumadocs-core/page-tree';
import type { ThemePageProps } from '@/types';
import styles from './Page.module.css';
import { useReaderMode } from './ReaderModeContext';
import { ReadingProgress } from './ReadingProgress';

export function Page({ page, tree }: ThemePageProps) {
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { readerMode, toggleReaderMode } = useReaderMode();

  useEffect(() => { setIsClient(true); }, []);

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
      <main className={`${styles.main} ${readerMode ? styles.readerMode : ''}`}>
        <div className={styles.navbar}>
          <div className={styles.navLeft}>
            <div className={styles.arrows}>
              {prev ? (
                <RouterLink to={prev.url} className={styles.arrowLink} aria-label='Previous page'>
                  <ArrowLeftIcon width={14} height={14} />
                </RouterLink>
              ) : (
                <span className={styles.arrowDisabled} aria-hidden='true'>
                  <ArrowLeftIcon width={14} height={14} />
                </span>
              )}
              {next ? (
                <RouterLink to={next.url} className={styles.arrowLink} aria-label='Next page'>
                  <ArrowRightIcon width={14} height={14} />
                </RouterLink>
              ) : (
                <span className={styles.arrowDisabled} aria-hidden='true'>
                  <ArrowRightIcon width={14} height={14} />
                </span>
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
            {settingsOpen ? (
              <>
                <IconButton size={2} onClick={toggleReaderMode} aria-label='Toggle reader mode'>
                  <EyeIcon width={14} height={14} />
                </IconButton>
                {isClient && (
                  <IconButton
                    size={2}
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  >
                    {resolvedTheme === 'dark'
                      ? <SunIcon width={14} height={14} />
                      : <MoonIcon width={14} height={14} />
                    }
                  </IconButton>
                )}
                <IconButton size={2} onClick={() => setSettingsOpen(false)} aria-label='Close settings'>
                  <XMarkIcon width={14} height={14} />
                </IconButton>
              </>
            ) : (
              <IconButton size={2} onClick={() => setSettingsOpen(true)} aria-label='Open settings'>
                <AdjustmentsHorizontalIcon width={14} height={14} />
              </IconButton>
            )}
          </div>
        </div>
        <article className={styles.article} data-article-content>
          <div className={styles.content}>{page.content}</div>
        </article>
      </main>
      {!readerMode && <ReadingProgress items={page.toc} />}
    </>
  );
}
