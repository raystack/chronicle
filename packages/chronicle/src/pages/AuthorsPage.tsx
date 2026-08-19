import { Avatar } from '@raystack/apsara';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import type { AuthorIndex, AuthorSummary } from '@/lib/author-index';
import { authorInitials } from '@/lib/authors';
import { authorsUrl } from '@/lib/data-urls';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import { NotFound } from '@/pages/NotFound';
import styles from './AuthorsPage.module.css';

/**
 * Loads the author index once per mount. The index covers every page in the site,
 * so it is fetched rather than embedded in each page's data.
 */
function useAuthorIndex(): { index: AuthorIndex | null; isLoading: boolean } {
  // Present when the server rendered this route, so the first paint needs no fetch.
  const { authorIndex } = usePageContext();
  const [index, setIndex] = useState<AuthorIndex | null>(authorIndex);
  const [isLoading, setIsLoading] = useState(authorIndex === null);

  useEffect(() => {
    if (authorIndex) return;
    let cancelled = false;
    fetch(authorsUrl())
      .then(res => (res.ok ? res.json() : { authors: [] }))
      .then(data => {
        if (!cancelled) setIndex(data as AuthorIndex);
      })
      .catch(() => {
        if (!cancelled) setIndex({ authors: [] });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authorIndex]);

  return { index, isLoading };
}

function AuthorAvatar({ author, size }: { author: AuthorSummary; size: 3 | 6 }) {
  return (
    <Avatar
      size={size}
      src={author.avatar}
      alt={author.name}
      fallback={authorInitials(author.name)}
    />
  );
}

function pageCountLabel(count: number): string {
  return count === 1 ? '1 page' : `${count} pages`;
}

/** `/authors` — every author found in the content. */
export function AuthorsPage() {
  const { config } = usePageContext();
  const { index, isLoading } = useAuthorIndex();
  const authors = index?.authors ?? [];

  return (
    <>
      <Head title='Authors' description={`People writing ${config.site.title}`} config={config} />
      <div className={styles.root}>
        <h1 className={styles.title}>Authors</h1>
        {isLoading ? null : authors.length === 0 ? (
          <p className={styles.empty}>No pages declare an author yet.</p>
        ) : (
          <ul className={styles.authorList}>
            {authors.map(author => (
              <li key={author.slug}>
                <RouterLink to={`/authors/${author.slug}`} className={styles.authorCard}>
                  <AuthorAvatar author={author} size={3} />
                  <span className={styles.authorText}>
                    <span className={styles.authorName}>{author.name}</span>
                    {author.bio && <span className={styles.authorBio}>{author.bio}</span>}
                  </span>
                  <span className={styles.count}>{pageCountLabel(author.pages.length)}</span>
                </RouterLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

interface AuthorDetailPageProps {
  authorSlug: string;
}

/** `/authors/<slug>` — one author's profile and everything they wrote. */
export function AuthorDetailPage({ authorSlug }: AuthorDetailPageProps) {
  const { config } = usePageContext();
  const { index, isLoading } = useAuthorIndex();

  if (isLoading) return null;

  const author = index?.authors.find(entry => entry.slug === authorSlug);
  if (!author) return <NotFound />;

  const groups = new Map<string, typeof author.pages>();
  for (const page of author.pages) {
    const existing = groups.get(page.dirLabel);
    if (existing) existing.push(page);
    else groups.set(page.dirLabel, [page]);
  }

  return (
    <>
      <Head
        title={author.name}
        description={author.bio ?? `Pages written by ${author.name}`}
        config={config}
      />
      <div className={styles.root}>
        <header className={styles.profile}>
          <AuthorAvatar author={author} size={6} />
          <div className={styles.profileText}>
            <h1 className={styles.title}>{author.name}</h1>
            {author.bio && <p className={styles.bio}>{author.bio}</p>}
            <div className={styles.links}>
              {author.url && (
                <a className={styles.link} href={author.url} rel='noreferrer' target='_blank'>
                  {author.url.replace(/^https?:\/\//, '')}
                </a>
              )}
              {author.email && (
                <a className={styles.link} href={`mailto:${author.email}`}>
                  {author.email}
                </a>
              )}
            </div>
          </div>
        </header>

        {[...groups.entries()].map(([dirLabel, pages]) => (
          <section className={styles.group} key={dirLabel}>
            <h2 className={styles.groupTitle}>{dirLabel}</h2>
            <ul className={styles.pageList}>
              {pages.map(page => (
                <li key={page.url}>
                  <RouterLink to={page.url} className={styles.pageCard}>
                    <span className={styles.pageTitle}>{page.title}</span>
                    {page.description && <span className={styles.pageDescription}>{page.description}</span>}
                    {page.lastModified && (
                      <time className={styles.pageDate} dateTime={page.lastModified}>
                        {page.lastModified}
                      </time>
                    )}
                  </RouterLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
