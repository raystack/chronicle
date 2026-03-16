import '@raystack/apsara/normalize.css'
import '@raystack/apsara/style.css'
import type { Metadata } from 'next'
import { loadConfig } from '@/lib/config'
import { Providers } from './providers'

const config = loadConfig()

export const metadata: Metadata = {
  title: {
    default: config.title,
    template: `%s | ${config.title}`,
  },
  description: config.description,
  ...(config.url && {
    metadataBase: new URL(config.url),
    openGraph: {
      title: config.title,
      description: config.description,
      url: config.url,
      siteName: config.title,
      type: 'website',
      images: [{ url: '/og?title=' + encodeURIComponent(config.title), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
      images: ['/og?title=' + encodeURIComponent(config.title)],
    },
  }),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {config.url && (
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: config.title,
              description: config.description,
              url: config.url,
            }, null, 2)}
          </script>
        )}
        <Providers analytics={config.analytics ?? { enabled: false }}>{children}</Providers>
      </body>
    </html>
  )
}
