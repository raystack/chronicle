import type { ReactNode } from 'react';
import { usePageContext } from '@/lib/page-context';
import { getTheme } from '@/themes/registry';

interface DocsLayoutProps {
  children: ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const { config, tree } = usePageContext();
  const { Layout, className } = getTheme(config.theme?.name);

  return (
    <Layout config={config} tree={tree} classNames={{ layout: className }}>
      {children}
    </Layout>
  );
}
