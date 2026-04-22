import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { usePageContext } from '@/lib/page-context';
import { getActiveContentDir } from '@/lib/navigation';
import {
  filterPageTreeByContentDir,
  filterPageTreeByVersion,
} from '@/lib/version-source';
import { getTheme } from '@/themes/registry';

interface DocsLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export function DocsLayout({ children, hideSidebar }: DocsLayoutProps) {
  const { config, tree, version } = usePageContext();
  const { pathname } = useLocation();
  const { Layout, className } = getTheme(config.theme?.name);

  const activeContentDir = getActiveContentDir(pathname, config);
  const versionScoped = filterPageTreeByVersion(tree, version, config);
  const scopedTree = filterPageTreeByContentDir(
    versionScoped,
    version,
    activeContentDir,
  );

  return (
    <Layout
      config={config}
      tree={scopedTree}
      hideSidebar={hideSidebar}
      classNames={{ layout: className }}
    >
      {children}
    </Layout>
  );
}
