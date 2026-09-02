'use client';

import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';
import { flattenTree } from 'fumadocs-core/page-tree';
import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { AuthorByline } from '@/components/common/author-byline';
import { getActiveContentDir } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';
import {
  filterPageTreeByContentDir,
  filterPageTreeByVersion
} from '@/lib/version-source';
import type { ThemePageProps } from '@/types';
import styles from './Page.module.css';
import { PageNav } from './PageNav';

/** The asterisk rule a printer lays down before a report. Exported so the
 *  skeleton draws the same one rather than keeping its own copy. */
export const STARS = '*'.repeat(400);

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A title this short is a code or a command — `SPP`, `XTCE`, `astro spp` — and
 * gets the masthead. Tune this and nothing else: it is the only place the
 * display has a boundary.
 */
const MASTHEAD_MAX_CHARS = 10;

/**
 * Two sizes, not a ladder. Sizing in several steps by character count meant one
 * character could cost 30% of the size, so `Space Packet Protocol` and
 * `Encapsulation Packet Protocol` — siblings in the same folder — came out
 * visibly different. Every title that is a name now renders at one size.
 */
function displaySize(title: string): 'code' | 'name' {
  return title.length <= MASTHEAD_MAX_CHARS ? 'code' : 'name';
}

export function Page({ page, config, tree }: ThemePageProps) {
  const { pathname } = useLocation();
  const { version } = usePageContext();

  const contentDir = getActiveContentDir(pathname, config);
  const section = config.content?.find(c => c.dir === contentDir)?.label;

  /**
   * The printed header reads as a report on one section, so the trail and the
   * page counter are both scoped to the content directory being read.
   *
   * The tree may or may not already be scoped: `entry-server` unwraps it itself
   * when a site has a single content directory. Scoping an unwrapped tree again
   * silently returns its first sub-folder — or nothing, for a flat directory —
   * which emptied the trail and dropped the counter. So the narrower tree is
   * only taken when it still contains the page being rendered.
   */
  const sectionTree = useMemo(() => {
    const versioned = filterPageTreeByVersion(tree, version, config);
    const scoped = filterPageTreeByContentDir(versioned, version, contentDir);
    const holdsThisPage = flattenTree(scoped.children).some(
      p => p.url === pathname
    );
    return holdsThisPage ? scoped : versioned;
  }, [tree, version, config, contentDir, pathname]);

  const crumbs = useMemo(
    () =>
      getBreadcrumbItems(pathname, sectionTree, { includePage: true }).map(
        item => item.name
      ),
    [pathname, sectionTree]
  );

  // "PAGE 03 / 22" — where this page falls in the section being read.
  const { index, total } = useMemo(() => {
    const pages = flattenTree(sectionTree.children);
    return {
      index: pages.findIndex(p => p.url === pathname) + 1,
      total: pages.length
    };
  }, [sectionTree, pathname]);
  const title = page.frontmatter.title ?? '';

  const trail = [section, ...crumbs].filter(Boolean).join(' / ');
  const counter = index > 0 ? `PAGE ${pad(index)} / ${pad(total)}` : null;

  return (
    <div className={styles.pageRow}>
      <main className={styles.sheet}>
        <header className={styles.headerBand}>
          <div className={styles.stars} aria-hidden='true'>
            {STARS}
          </div>
          <div className={styles.metaLine}>
            ** {trail}
            {counter ? ` * ${counter}` : ''}
          </div>
          <div className={styles.metaLine}>
            ** {config.site.title}
            {section ? ` * ${section}` : ''}
          </div>
          <div className={styles.metaLine}>** {pathname}</div>
        </header>

        <div className={styles.displayBand}>
          <h1 className={styles.display} data-size={displaySize(title)}>
            {title}
          </h1>
          {page.frontmatter.description ? (
            <p className={styles.subtitle}>{page.frontmatter.description}</p>
          ) : null}
        </div>

        {page.frontmatter.authors?.length ? (
          <div className={styles.byline}>
            <AuthorByline authors={page.frontmatter.authors} variant='inline' />
          </div>
        ) : null}

        <article className={styles.article} data-article-content>
          {page.content}
        </article>

        <footer className={styles.footerBand}>
          <div className={styles.footerRule} />
          {page.prev || page.next ? (
            <div className={styles.footerNav}>
              {page.prev ? (
                <RouterLink to={page.prev.url} className={styles.footerLink}>
                  ← {page.prev.title}
                </RouterLink>
              ) : null}
              {page.next ? (
                <RouterLink
                  to={page.next.url}
                  className={`${styles.footerLink} ${styles.footerLinkNext}`}
                >
                  {page.next.title} →
                </RouterLink>
              ) : null}
            </div>
          ) : null}
          <div className={styles.footerMeta}>
            <span>** {config.site.description ?? config.site.title} **</span>
            {counter ? <span>{counter}</span> : null}
          </div>
        </footer>
      </main>

      <PageNav items={page.toc} />
    </div>
  );
}
