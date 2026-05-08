import {
  EyeIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MixerHorizontalIcon,
  Cross2Icon
} from '@radix-ui/react-icons'
import { IconButton, useTheme } from '@raystack/apsara';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { flattenTree } from 'fumadocs-core/page-tree';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
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

  const slug = pathname === '/' ? [] : pathname.replace(/^\//, '').split('/');

  const { prev, next } = useMemo(() => {
    const pages = flattenTree(tree.children);
    const currentIndex = pages.findIndex(p => p.url === pathname);
    return {
      prev: currentIndex > 0 ? pages[currentIndex - 1] : null,
      next: currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null,
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
            <Breadcrumbs slug={slug} tree={tree} className={styles.breadcrumb} />
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
                  <Cross2Icon width={14} height={14} />
                </IconButton>
              </>
            ) : (
              <IconButton size={2} onClick={() => setSettingsOpen(true)} aria-label='Open settings'>
                <MixerHorizontalIcon width={14} height={14} />
              </IconButton>
            )}
          </div>
        </div>
        <div className={styles.content}>
          <header className={styles.articleHeader}>
            {page.frontmatter._readingTime && (
              <span className={styles.readingTime}>{page.frontmatter._readingTime}min Read</span>
            )}
            <h1 className={styles.articleTitle}>{page.frontmatter.title}</h1>
            {page.frontmatter.description && (
              <p className={styles.articleDescription}>{page.frontmatter.description}</p>
            )}
            <hr className={styles.articleSeparator} />
          </header>
          <article className={styles.article} data-article-content>
            {page.content}
          </article>
        </div>
      </main>
      {!readerMode && <ReadingProgress items={page.toc} />}
    </>
  );
}
