import { Skeleton } from '@raystack/apsara';
import { Flex } from '@raystack/apsara';
import styles from './Page.module.css';

export function PageSkeleton() {
  return (
    <Flex className={styles.page}>
      <article className={styles.article}>
        <Skeleton width="40%" height="32px" />
        <Skeleton.Provider duration={2}>
          <Skeleton width="100%" height="16px" />
          <Skeleton width="95%" height="16px" />
          <Skeleton width="80%" height="16px" />
          <Skeleton width="100%" height="16px" />
          <Skeleton width="60%" height="16px" />
        </Skeleton.Provider>
        <Skeleton width="30%" height="24px" />
        <Skeleton.Provider duration={2}>
          <Skeleton width="100%" height="16px" />
          <Skeleton width="90%" height="16px" />
          <Skeleton width="100%" height="16px" />
          <Skeleton width="70%" height="16px" />
        </Skeleton.Provider>
      </article>
    </Flex>
  );
}
