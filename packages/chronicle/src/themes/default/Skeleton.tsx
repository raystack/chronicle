import { Skeleton } from '@raystack/apsara';
import { Flex } from '@raystack/apsara';
import styles from './Page.module.css';

export function PageSkeleton() {
  return (
    <Flex className={styles.page}>
      <article className={styles.article}>
        <Skeleton width="40%" height="var(--rs-line-height-t2)" containerClassName={styles.headerLoader} />
        <Skeleton width="60%" height="var(--rs-line-height-regular)" containerClassName={styles.headerLoader} />
        {[...new Array(20)].map((_, i) => (
          <Skeleton key={i} width="100%" height="var(--rs-line-height-regular)" containerClassName={styles.loader} />
        ))}
      </article>
    </Flex>
  );
}
