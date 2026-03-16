import type { ChronicleConfig } from '@/types'

export interface HeadProps {
  title: string
  description?: string
  config: ChronicleConfig
  jsonLd?: Record<string, unknown>
}

export function Head({ title, description, config, jsonLd }: HeadProps) {
  const fullTitle = `${title} | ${config.title}`
  const ogParams = new URLSearchParams({ title })
  if (description) ogParams.set('description', description)

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}

      {config.url && (
        <>
          <meta property="og:title" content={title} />
          {description && <meta property="og:description" content={description} />}
          <meta property="og:site_name" content={config.title} />
          <meta property="og:type" content="website" />
          <meta property="og:image" content={`/og?${ogParams.toString()}`} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          {description && <meta name="twitter:description" content={description} />}
          <meta name="twitter:image" content={`/og?${ogParams.toString()}`} />
        </>
      )}

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd, null, 2) }}
        />
      )}
    </>
  )
}
