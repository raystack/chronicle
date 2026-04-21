import { getLandingEntries } from '@/lib/config';
import { usePageContext } from '@/lib/page-context';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const { config, version } = usePageContext();
  const entries = getLandingEntries(config, version.dir);

  const heading = version.dir === null
    ? config.site.title
    : `${config.site.title} — ${versionLabel(config, version.dir)}`;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{heading}</h1>
      {config.description ? (
        <p className={styles.description}>{config.description}</p>
      ) : null}
      <div className={styles.grid}>
        {entries.map((entry) => (
          <a key={entry.href} href={entry.href} className={styles.card}>
            <span className={styles.cardLabel}>{entry.label}</span>
            <span className={styles.cardHref}>{entry.href}</span>
          </a>
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
