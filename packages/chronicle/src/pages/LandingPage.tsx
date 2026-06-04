import { FolderIcon } from '@heroicons/react/24/outline';
import { Link as RouterLink } from 'react-router';
import { getLandingEntries } from '@/lib/config';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const { config, version } = usePageContext();
  const entries = getLandingEntries(config, version.dir);

  const heading = version.dir === null
    ? config.site.title
    : `${config.site.title} — ${versionLabel(config, version.dir)}`;

  return (
    <>
      <Head
        title={version.dir ? `${config.site.title} — ${versionLabel(config, version.dir)}` : 'Documentation'}
        description={config.site.description}
        config={config}
      />
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title}>{heading}</h1>
        {config.site.description ? (
          <p className={styles.description}>{config.site.description}</p>
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
    </>
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
