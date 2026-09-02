import { WarningIcon } from '@/components/ui/icons';
import { EmptyState } from '@raystack/apsara';
import styles from './NotFound.module.css';

export function RenderError({ message }: { message: string | null }) {
  return (
    <div className={styles.emptyStateHost}>
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
