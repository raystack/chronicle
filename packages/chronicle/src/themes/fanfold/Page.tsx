'use client';

import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';
import { flattenTree } from 'fumadocs-core/page-tree';
import type { Node } from 'fumadocs-core/page-tree';
import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { AuthorByline } from '@/components/common/author-byline';
import { getActiveContentDir } from '@/lib/navigation';
import { usePageContext } from '@/lib/page-context';
import { NodeType, shortName } from '@/lib/tree-utils';
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
 * Every `short` in a tree, by the URL that carries it.
 *
 * The printed trail wants the codes a reader already uses — "TRANSPORT / SPP" —
 * where `getBreadcrumbItems` hands back full names, because it is fumadocs' own
 * and knows nothing about `short`. The tree does: `attachShortNames` puts one on
 * every page node and on each folder's index. Collecting them here rather than
 * teaching the shared breadcrumb helper keeps the other two themes, which render
 * their breadcrumbs from it and never use `short`, exactly as they were.
 */
function collectShortNames(nodes: Node[], into = new Map<string, string>()) {
  for (const node of nodes) {
    if (node.type === NodeType.Folder) {
      // A folder's own name comes from `meta.json`; its short, if any, is on the
      // index page the crumb actually links to.
      if (node.index) {
        const short = shortName(node.index);
        if (short) into.set(node.index.url, short);
      }
      collectShortNames(node.children, into);
      continue;
    }
    if (node.type !== NodeType.Page) continue;
    const short = shortName(node);
    if (short) into.set(node.url, short);
  }
  return into;
}


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
   * The tree handed here may already be scoped — `entry-server` narrows it when
   * a site has a single content directory — but both filters recognise that and
   * hand such a tree back untouched.
   */
  const sectionTree = useMemo(
    () =>
      filterPageTreeByContentDir(
        filterPageTreeByVersion(tree, version, config),
        version,
        contentDir
      ),
    [tree, version, config, contentDir]
  );

  const shorts = useMemo(
    () => collectShortNames(sectionTree.children),
    [sectionTree]
  );

  const crumbs = useMemo(
    () =>
      getBreadcrumbItems(pathname, sectionTree, { includePage: true }).map(
        item => (item.url ? shorts.get(item.url) : undefined) ?? item.name
      ),
    [pathname, sectionTree, shorts]
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

  /**
   * The trail leads with the section, then the crumbs. `getBreadcrumbItems`
   * starts at the tree root, and that root's name is the section's own label,
   * so the two met and the header read "DOCS / DOCS / GETTING STARTED".
   * Dropping any name that repeats the one before it also covers a folder whose
   * index page carries the folder's title.
   */
  const trail = [section, ...crumbs]
    .filter(Boolean)
    .filter((name, i, all) => i === 0 || name !== all[i - 1])
    .join(' / ');

  /**
   * The lines under the trail. A page that states its own identifiers — the
   * standard it implements, the package, the command — has more to print here
   * than the theme can work out for itself, so those win. Without them the
   * header still fills: what site this is, what section, and where the page
   * sits, which is all a theme can know on its own.
   */
  const identifiers = page.frontmatter.identifiers ?? [];
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
          {identifiers.length ? (
            identifiers.map(line => (
              <div key={line} className={styles.metaLine}>
                ** {line}
              </div>
            ))
          ) : (
            <>
              <div className={styles.metaLine}>
                ** {config.site.title}
                {section ? ` * ${section}` : ''}
              </div>
              <div className={styles.metaLine}>** {pathname}</div>
            </>
          )}
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
