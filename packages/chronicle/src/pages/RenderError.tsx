import { WarningIcon } from '@/components/ui/icons';
import { EmptyState } from '@raystack/apsara';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import styles from './NotFound.module.css';

export function RenderError({ message }: { message: string | null }) {
  const { config } = usePageContext();

  return (
    <div className={styles.emptyStateHost}>
      <Head title='Failed to render page' config={config} />
      <EmptyState
        icon={<WarningIcon width={32} height={32} />}
        heading="Failed to render page"
        subHeading={
          message
            ? <pre className={styles.errorDetail}>{message}</pre>
            : 'Something went wrong while rendering this page.'
        }
      />
    </div>
  );
}
