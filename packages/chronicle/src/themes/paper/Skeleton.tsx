import { Skeleton } from '@raystack/apsara';
import styles from './Page.module.css';

export function PageSkeleton() {
  return (
    <main className={styles.main}>
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
