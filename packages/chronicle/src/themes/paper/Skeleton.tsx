import { Skeleton } from '@raystack/apsara';
import styles from './Page.module.css';
import { cx } from 'class-variance-authority';

export function PageSkeleton() {
  return (
    <main className={styles.main}>
      <div className={styles.navbar}>
        <div className={cx(styles.navLeft, styles.navbarLoaderWrapper)}>
          <Skeleton highlightColor="var(--rs-color-foreground-base-emphasis)" containerClassName={styles.loader}/>
        </div>
        <div className={cx(styles.navRight, styles.navbarLoaderWrapper)}>
          <Skeleton highlightColor="var(--rs-color-foreground-base-emphasis)" containerClassName={styles.loader}/>
        </div>
      </div>
    <div className={styles.content}>
        <header className={styles.articleHeader}>
          <Skeleton width="50%" height="16px" containerClassName={styles.headerLoader}/>
          <Skeleton width="70%" height="32px" containerClassName={styles.headerLoader}/>
          <Skeleton width="50%" height="16px" containerClassName={styles.headerLoader}/>
      </header>
        <div className={styles.article}>
          {
            [...new Array(30)].map((_, i) => {
              return <Skeleton key={i} width="100%" height="20px" containerClassName={styles.loader}/>
            })
          }
      </div>
    </div>
    </main>
  );
}
