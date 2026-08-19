import { Navigate } from 'react-router';
import { StatusCodes } from 'http-status-codes';
import { resolveAuthors } from '@/lib/authors';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import { resolveDocsRedirect } from '@/lib/tree-utils';
import { NotFound } from '@/pages/NotFound';
import { RenderError } from '@/pages/RenderError';
import { getTheme } from '@/themes/registry';

interface DocsPageProps {
  slug: string[];
}

export function DocsPage({ slug }: DocsPageProps) {
  const { config, tree, page, isLoading, errorStatus, errorMessage } = usePageContext();

  if (errorStatus === StatusCodes.NOT_FOUND) {
    const contentConfig = config.content?.find(c => c.dir === slug[0]);
    const redirectUrl = resolveDocsRedirect(slug, tree, contentConfig);
    if (redirectUrl) return <Navigate to={redirectUrl} replace />;
    return <NotFound />;
  }
  if (errorStatus) return <RenderError message={errorMessage} />;
  const { Page, Skeleton } = getTheme(config.theme?.name);

  if (isLoading || !page) return <Skeleton />;
  const pageUrl = config.url ? `${config.url}/${slug.join('/')}` : undefined;
  const markdownHref = `/${slug.join('/')}.md`;
  const authors = resolveAuthors(page.frontmatter.authors, config);

  return (
    <>
      <Head
        title={page.frontmatter.title}
        description={page.frontmatter.description}
        authors={authors.map(author => author.name)}
        config={config}
        markdownHref={markdownHref}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: page.frontmatter.title,
          description: page.frontmatter.description,
          ...(pageUrl && { url: pageUrl }),
          ...(page.frontmatter.lastModified && { dateModified: new Date(page.frontmatter.lastModified).toISOString() }),
          ...(authors.length > 0 && {
            author: authors.map(author => ({
              '@type': 'Person',
              name: author.name,
              ...(author.email && { email: author.email }),
            })),
          }),
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
