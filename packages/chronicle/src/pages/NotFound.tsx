import { FileTextIcon } from '@/components/ui/icons';
import { EmptyState } from '@raystack/apsara';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <div className={styles.emptyStateHost}>
      <EmptyState
        icon={<FileTextIcon width={32} height={32} />}
        heading="404"
        subHeading="Page not found"
      />
    </div>
  );
}
