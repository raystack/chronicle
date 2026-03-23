import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import { getTheme } from '@/themes/registry';

interface DocsPageProps {
  slug: string[];
}

export function DocsPage({ slug }: DocsPageProps) {
  const { config, tree, page } = usePageContext();

  if (!page) return null;

  const { Page } = getTheme(config.theme?.name);
  const pageUrl = config.url ? `${config.url}/${slug.join('/')}` : undefined;

  return (
    <>
      <Head
        title={page.frontmatter.title}
        description={page.frontmatter.description}
        config={config}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: page.frontmatter.title,
          description: page.frontmatter.description,
          ...(pageUrl && { url: pageUrl })
        }}
      />
      <Page
        page={{
          slug,
          frontmatter: page.frontmatter,
          content: page.content,
          toc: []
        }}
        config={config}
        tree={tree}
      />
    </>
  );
}
