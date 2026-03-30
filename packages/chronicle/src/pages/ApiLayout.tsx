import { cx } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { Search } from '@/components/ui/search';
import { buildApiPageTree } from '@/lib/api-routes';
import { usePageContext } from '@/lib/page-context';
import { getTheme } from '@/themes/registry';
import styles from './ApiLayout.module.css';

interface ApiLayoutProps {
  children: ReactNode;
}

export function ApiLayout({ children }: ApiLayoutProps) {
  const { config, apiSpecs } = usePageContext();
  const { Layout, className } = getTheme(config.theme?.name);
  const tree = buildApiPageTree(apiSpecs);

  return (
    <Layout
      config={config}
      tree={tree}
      classNames={{
        layout: cx(styles.layout, className),
        body: styles.body,
        sidebar: styles.sidebar,
        content: styles.content
      }}
    >
      <Search className={styles.hiddenSearch} />
      {children}
    </Layout>
  );
}
