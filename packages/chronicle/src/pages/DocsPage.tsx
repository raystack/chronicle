import { Navigate } from 'react-router';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import { NotFound } from '@/pages/NotFound';
import { getTheme } from '@/themes/registry';
import type { Node } from 'fumadocs-core/page-tree';

function getFirstPageUrl(nodes: Node[]): string | null {
  for (const node of nodes) {
    if (node.type === 'page') return node.url;
    if (node.type === 'folder') {
      const url = getFirstPageUrl(node.children);
      if (url) return url;
    }
  }
  return null;
}

interface DocsPageProps {
  slug: string[];
}

export function DocsPage({ slug }: DocsPageProps) {
  const { config, tree, page, isLoading, errorStatus } = usePageContext();

  if (errorStatus === 404) {
    const isContentRoot = config.content?.some(c => slug.length === 1 && slug[0] === c.dir);
    if (isContentRoot) {
      const firstUrl = getFirstPageUrl(tree.children);
      if (firstUrl) return <Navigate to={firstUrl} replace />;
    }
    return <NotFound />;
  }
  if (errorStatus) return <NotFound />;
  const { Page, Skeleton } = getTheme(config.theme?.name);

  if (isLoading || !page) return <Skeleton />;
  const pageUrl = config.url ? `${config.url}/${slug.join('/')}` : undefined;
  const markdownHref = `/${slug.join('/')}.md`;

  return (
    <>
      <Head
        title={page.frontmatter.title}
        description={page.frontmatter.description}
        config={config}
        markdownHref={markdownHref}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: page.frontmatter.title,
          description: page.frontmatter.description,
          ...(pageUrl && { url: pageUrl })
        }}
      />
      <Page
        page={page}
        config={config}
        tree={tree}
      />
    </>
  );
}
