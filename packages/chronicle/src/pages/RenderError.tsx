import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { EmptyState } from '@raystack/apsara';
import styles from './NotFound.module.css';

export function RenderError({ message }: { message: string | null }) {
  return (
    <EmptyState
      icon={<ExclamationTriangleIcon width={32} height={32} />}
      heading="Failed to render page"
      subHeading={
        message
          ? <pre className={styles.errorDetail}>{message}</pre>
          : 'Something went wrong while rendering this page.'
      }
      classNames={{ container: styles.emptyState }}
    />
  );
}
