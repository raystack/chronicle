import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import { NotFound } from '@/pages/NotFound';
import { getTheme } from '@/themes/registry';

interface DocsPageProps {
  slug: string[];
}

export function DocsPage({ slug }: DocsPageProps) {
  const { config, tree, page, isLoading, errorStatus } = usePageContext();

  if (errorStatus === 404) return <NotFound />;
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
