import { FileTextIcon } from '@/components/ui/icons';
import { EmptyState } from '@raystack/apsara';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import styles from './NotFound.module.css';

export function NotFound() {
  const { config } = usePageContext();

  return (
    <div className={styles.emptyStateHost}>
      {/* The page that was asked for renders no `<Head>` of its own, so
          without this the tab would carry whatever the last page set. */}
      <Head title='Page not found' config={config} />
      <EmptyState
        icon={<FileTextIcon width={32} height={32} />}
        heading="404"
        subHeading="Page not found"
      />
    </div>
  );
}
