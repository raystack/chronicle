import { Skeleton } from '@raystack/apsara';
import { STARS } from './Page';
import styles from './Page.module.css';

export function PageSkeleton() {
  return (
    <div className={styles.pageRow}>
      <main className={styles.sheet}>
        <header className={styles.headerBand}>
          <div className={styles.stars} aria-hidden='true'>
            {STARS}
          </div>
          <Skeleton width='40%' height='12px' />
          <Skeleton width='30%' height='12px' />
          <Skeleton width='22%' height='12px' />
        </header>
        <div className={styles.displayBand}>
          <Skeleton width='45%' height='64px' />
        </div>
        <div className={styles.article}>
          {[...new Array(18)].map((_, i) => (
            <Skeleton key={i} width='100%' height='18px' />
          ))}
        </div>
      </main>
    </div>
  );
}
