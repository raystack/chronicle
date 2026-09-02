'use client';

import { Link as RouterLink } from 'react-router';
import type { ChronicleConfig, ThemeLandingProps } from '@/types';
import styles from './Landing.module.css';

const STARS = '*'.repeat(400);

const pad = (n: number) => String(n).padStart(2, '0');

const isExternal = (href: string) => /^https?:/.test(href);

/**
 * A title this short is a wordmark and gets the masthead. Anything longer is a
 * sentence-shaped name and gets one smaller size, for the same reason `Page`
 * uses two steps and not a ladder: sizing by character count in many steps made
 * near-identical titles come out visibly different.
 */
const MASTHEAD_MAX_CHARS = 12;

/** Links for the header rule, deduplicated by destination. */
function headerLinks(config: ChronicleConfig) {
  const all = [
    ...(config.navigation?.links ?? []),
    ...(config.links ?? []),
    ...(config.navigation?.social ?? []).map(s => ({
      label: s.type,
      href: s.href
    }))
  ];
  const seen = new Set<string>();
  return all.filter(link => {
    const key = link.href.replace(/\/+$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Strips the scheme so the printed line reads as a citation, not a URL. */
function bareUrl(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

export function Landing({
  config,
  entries,
  heading,
  description,
  versionLabel
}: ThemeLandingProps) {
  const links = headerLinks(config);
  const size = heading.length <= MASTHEAD_MAX_CHARS ? 'wordmark' : 'name';

  // "** DOCS * V2.1" — the ident line a printer lays down before the report.
  const ident = `** ${[config.site.title, versionLabel]
    .filter(Boolean)
    .join(' * ')}`;

  return (
    // The data attribute lets the layout widen this band past the measure it
    // caps other full-width pages at. See `Layout.module.css`.
    <div className={styles.root} data-fanfold-landing>
      <header className={styles.headerBand}>
        <div className={styles.stars} aria-hidden='true'>
          {STARS}
        </div>
        {/* Both struck lines stay together in one block so that when the row
            turns into a column at narrow widths the links drop below them,
            rather than landing between the two. */}
        <div className={styles.identRow}>
          <div className={styles.identLines}>
            <span className={styles.ident}>{ident}</span>
            {config.url ? (
              <span className={styles.ident}>** {bareUrl(config.url)}</span>
            ) : null}
          </div>
          {links.length ? (
            <nav className={styles.headerLinks}>
              {links.map(link => (
                <a
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  className={styles.headerLink}
                  target={isExternal(link.href) ? '_blank' : undefined}
                  rel={isExternal(link.href) ? 'noreferrer' : undefined}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
      </header>

      <div className={styles.heroBand}>
        <h1 className={styles.display} data-size={size}>
          {heading}
        </h1>
        {description ? <p className={styles.lede}>{description}</p> : null}
      </div>

      <section className={styles.registerBand}>
        {/* The column headers and this title are the only copy the theme
            supplies. Prose belongs to the site, so the hero description is the
            one place words come from config. */}
        <h2 className={styles.sectionTitle}>THE REGISTER</h2>

        <div className={styles.headRow} aria-hidden='true'>
          <span className={styles.colNo}>NO.</span>
          <span className={styles.colName}>SECTION</span>
          <span className={styles.colPath}>PATH</span>
          <span className={styles.colWhat}>WHAT IT COVERS</span>
        </div>

        <div className={styles.rows}>
          {entries.map((entry, i) => (
            <RouterLink key={entry.href} to={entry.href} className={styles.row}>
              <span className={styles.colNo}>{pad(i + 1)}</span>
              <span className={styles.colName}>
                <span className={styles.name}>{entry.label}</span>
              </span>
              <span className={styles.colPath}>{entry.href}</span>
              <span className={styles.colWhat}>{entry.description ?? '—'}</span>
            </RouterLink>
          ))}
        </div>
      </section>

      <footer className={styles.footerBand}>
        <div className={styles.footerRule} />
        <div className={styles.footerMeta}>
          <span>
            ** {config.site.title} ** {entries.length}{' '}
            {entries.length === 1 ? 'SECTION' : 'SECTIONS'} **
          </span>
          <span>PAGE 01 / 01</span>
        </div>
      </footer>
    </div>
  );
}
