import { FolderIcon } from '@heroicons/react/24/outline';
import { Link as RouterLink } from 'react-router';
import { getLandingEntries } from '@/lib/config';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import { getTheme } from '@/themes/registry';
import type { ThemeLandingProps } from '@/types';
import styles from './LandingPage.module.css';

/**
 * Resolves what the landing page shows, then hands it to the active theme.
 *
 * Themes that fill the `Landing` slot get to lay the page out themselves; the
 * rest fall through to `DefaultLanding` below. Config reading, the `<Head>`
 * tags and the version label stay here either way, so a theme never has to
 * repeat them.
 */
export function LandingPage() {
  const { config, version } = usePageContext();
  const entries = getLandingEntries(config, version.dir);
  const { Landing } = getTheme(config.theme?.name);

  // The heading only carries a version when an older one is being read, so the
  // latest reads as the site itself. `versionLabel` is the label either way —
  // a theme may want to print "0.3" even on the latest version.
  const olderLabel =
    version.dir === null ? null : versionLabel(config, version.dir);
  const heading = olderLabel
    ? `${config.site.title} — ${olderLabel}`
    : config.site.title;

  const props: ThemeLandingProps = {
    config,
    entries,
    heading,
    description: config.site.description,
    versionLabel: olderLabel ?? config.latest?.label ?? null,
  };

  return (
    <>
      <Head
        title={olderLabel ? `${config.site.title} — ${olderLabel}` : 'Documentation'}
        description={config.site.description}
        config={config}
      />
      {Landing ? <Landing {...props} /> : <DefaultLanding {...props} />}
    </>
  );
}

function DefaultLanding({ entries, heading, description }: ThemeLandingProps) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title}>{heading}</h1>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}
      </div>
      <div className={styles.grid}>
        {entries.map((entry, i) => (
          <RouterLink key={entry.href} to={entry.href} className={styles.card}>
            <div className={styles.cardImage} aria-hidden='true'>
              <span className={`${styles.cardImageLabel} ${styles.cardImageLabelTop}`}>
                Fig_{String(i + 1).padStart(3, '0')}
              </span>
              <span className={`${styles.cardImageLabel} ${styles.cardImageLabelRight}`}>
                [ {entry.label} ]
              </span>
              <FolderIcon className={styles.cardIcon} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardLabel}>{entry.label}</span>
              {entry.description ? (
                <span className={styles.cardDescription}>{entry.description}</span>
              ) : null}
            </div>
          </RouterLink>
        ))}
      </div>
    </div>
  );
}

function versionLabel(
  config: ReturnType<typeof usePageContext>['config'],
  versionDir: string,
): string {
  return (
    config.versions?.find((v) => v.dir === versionDir)?.label ?? versionDir
  );
}
