import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { EmptyState } from '@raystack/apsara';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <EmptyState
      icon={<DocumentTextIcon width={32} height={32} />}
      heading="404"
      subHeading="Page not found"
      classNames={{ container: styles.emptyState }}
    />
  );
}
