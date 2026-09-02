import { Skeleton, Flex, Sidebar } from '@raystack/apsara';
import { cx } from 'class-variance-authority';
import styles from './ApiSkeleton.module.css';
import layoutStyles from '@/themes/default/Layout.module.css';
import apiLayoutStyles from '@/pages/ApiLayout.module.css';

export function ApiPageSkeleton() {
  return (
    <Flex align="start" justify="between" className={styles.layout}>
      <Flex direction="column" gap={9} className={styles.left}>
        <Flex direction="column" gap={7}>
          <Flex direction="column" gap={4}>
            <Skeleton width="40%" height="var(--rs-line-height-t3)" />
            <Skeleton width="60%" height="var(--rs-line-height-regular)" />
          </Flex>
          <Flex align="center" gap={3} className={styles.methodBar}>
            <Skeleton width="48px" height="24px" />
            <Skeleton width="200px" height="var(--rs-line-height-regular)" />
          </Flex>
        </Flex>

        {[0, 1, 2].map(section => (
          <Flex direction="column" gap={4} key={section}>
            <Skeleton width="120px" height="var(--rs-line-height-small)" />
            {[0, 1, 2, 3].map(row => (
              <Flex align="center" gap={4} className={styles.fieldRow} key={row}>
                <Skeleton width="80px" height="var(--rs-line-height-small)" />
                <Skeleton width="60px" height="var(--rs-line-height-small)" />
              </Flex>
            ))}
          </Flex>
        ))}
      </Flex>

      <Flex direction="column" gap={8} className={styles.right}>
        <Flex direction="column" gap={3} className={styles.codeBlock}>
          <Skeleton width="50%" height="var(--rs-line-height-small)" />
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} width={`${70 + (i % 3) * 10}%`} height="var(--rs-line-height-small)" />
          ))}
        </Flex>
        <Flex direction="column" gap={3} className={styles.responseBlock}>
          <Skeleton width="40%" height="var(--rs-line-height-small)" />
          {[0, 1, 2].map(i => (
            <Skeleton key={i} width={`${60 + (i % 2) * 20}%`} height="var(--rs-line-height-small)" />
          ))}
        </Flex>
      </Flex>
    </Flex>
  );
}

function SidebarSkeleton() {
  return (
    <>
      {[0, 1, 2].map(group => (
        <Flex direction="column" gap={3} className={styles.sidebarGroup} key={group}>
          <Skeleton width="80px" height="var(--rs-line-height-small)" />
          {[0, 1, 2, 3].map(item => (
            <Flex align="center" gap={3} className={styles.sidebarItem} key={item}>
              <Skeleton width="100%" height="var(--rs-line-height-small)" />
            </Flex>
          ))}
        </Flex>
      ))}
    </>
  );
}

export function ApiFullSkeleton() {
  return (
    <Flex direction="column" className={cx(layoutStyles.layout, apiLayoutStyles.layout)}>
      <Flex className={layoutStyles.body}>
        <Sidebar
          defaultOpen
          collapsible='none'
          className={cx(layoutStyles.sidebar, apiLayoutStyles.sidebar)}
        >
          <Sidebar.Header className={layoutStyles.sidebarHeader}>
            <Skeleton width="100px" height="28px" />
          </Sidebar.Header>
          <Sidebar.Main className={layoutStyles.sidebarMain}>
            <SidebarSkeleton />
          </Sidebar.Main>
        </Sidebar>
        <Flex direction="column" className={layoutStyles.mainArea}>
          <div className={layoutStyles.cardWrapper}>
            <div className={layoutStyles.card}>
              <nav className={layoutStyles.subNav}>
                <Flex align="center" gap={3}>
                  <Skeleton width="24px" height="24px" />
                  <Skeleton width="24px" height="24px" />
                  <Skeleton width="150px" height="var(--rs-line-height-small)" />
                </Flex>
              </nav>
              <main className={cx(layoutStyles.content, apiLayoutStyles.content)}>
                <ApiPageSkeleton />
              </main>
            </div>
          </div>
        </Flex>
      </Flex>
    </Flex>
  );
}
