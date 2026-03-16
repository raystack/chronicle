import '@raystack/apsara/normalize.css'
import '@raystack/apsara/style.css'
import { ThemeProvider } from '@raystack/apsara'
import { useLocation } from 'react-router-dom'
import { loadConfig } from '@/lib/config'
import { Head } from '@/lib/head'
import { DocsLayout } from '@/pages/DocsLayout'
import { DocsPage } from '@/pages/DocsPage'
import { ApiLayout } from '@/pages/ApiLayout'
import { ApiPage } from '@/pages/ApiPage'
import { NotFound } from '@/pages/NotFound'

function resolveRoute(pathname: string) {
  if (pathname.startsWith('/apis')) {
    const slug = pathname.replace(/^\/apis\/?/, '').split('/').filter(Boolean)
    return { type: 'api' as const, slug }
  }

  const slug = pathname === '/' ? [] : pathname.slice(1).split('/').filter(Boolean)
  return { type: 'docs' as const, slug }
}

export function App() {
  const { pathname } = useLocation()
  const config = loadConfig()
  const route = resolveRoute(pathname)

  return (
    <ThemeProvider enableSystem>
      <RootHead config={config} />
      {route.type === 'api' ? (
        <ApiLayout>
          <ApiPage slug={route.slug} />
        </ApiLayout>
      ) : (
        <DocsLayout>
          <DocsPage slug={route.slug} />
        </DocsLayout>
      )}
    </ThemeProvider>
  )
}

function RootHead({ config }: { config: ReturnType<typeof loadConfig> }) {
  return (
    <Head
      title={config.title}
      description={config.description}
      config={config}
      jsonLd={config.url ? {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: config.title,
        description: config.description,
        url: config.url,
      } : undefined}
    />
  )
}
