import { EmptyState } from '@raystack/apsara';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <EmptyState
      heading="404"
      subHeading="Page not found"
      classNames={{ container: styles.emptyState }}
    />
  );
}
