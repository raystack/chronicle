import { useLocation } from 'react-router';
import type { ChronicleConfig } from '@/types';

export interface HeadProps {
  title: string;
  description?: string;
  /** Author names, already parsed out of frontmatter. */
  authors?: string[];
  config: ChronicleConfig;
  jsonLd?: Record<string, unknown>;
  markdownHref?: string;
}

export function Head({ title, description: pageDescription, authors, config, jsonLd, markdownHref }: HeadProps) {
  const { pathname } = useLocation();
  const description = pageDescription || config.site.description;
  const fullTitle = `${title} | ${config.site.title}`;
  const ogParams = new URLSearchParams({ title });
  if (description) ogParams.set('description', description);
  if (authors?.length) ogParams.set('authors', authors.join(', '));
  const siteUrl = config.url ? config.url.replace(/\/$/, '') : null;
  const canonical = siteUrl ? `${siteUrl}${pathname}` : null;
  const ogImage = siteUrl
    ? `${siteUrl}/og?${ogParams.toString()}`
    : `/og?${ogParams.toString()}`;

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name='description' content={description} />}
      {canonical && <link rel='canonical' href={canonical} />}
      {markdownHref && (
        <link
          rel='alternate'
          type='text/markdown'
          href={markdownHref}
          title={`${title} (Markdown)`}
        />
      )}

      {config.url && (
        <>
          <meta property='og:title' content={title} />
          {description && (
            <meta property='og:description' content={description} />
          )}
          <meta property='og:site_name' content={config.site.title} />
          <meta property='og:type' content='website' />
          {canonical && <meta property='og:url' content={canonical} />}
          <meta property='og:image' content={ogImage} />
          <meta property='og:image:width' content='1200' />
          <meta property='og:image:height' content='630' />

          <meta name='twitter:card' content='summary_large_image' />
          <meta name='twitter:title' content={title} />
          {description && (
            <meta name='twitter:description' content={description} />
          )}
          <meta name='twitter:image' content={ogImage} />
        </>
      )}

      {jsonLd && (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd, null, 2) }}
        />
      )}
    </>
  );
}
