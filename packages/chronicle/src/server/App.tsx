import '@raystack/apsara/normalize.css';
import '@raystack/apsara/style.css';
import { ThemeProvider } from '@raystack/apsara';
import { useLocation } from 'react-router';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import { ApiLayout } from '@/pages/ApiLayout';
import { ApiPage } from '@/pages/ApiPage';
import { DocsLayout } from '@/pages/DocsLayout';
import { DocsPage } from '@/pages/DocsPage';
import type { ChronicleConfig } from '@/types';
import { getThemeConfig } from '@/themes/registry';

function resolveRoute(pathname: string) {
  if (pathname.startsWith('/apis')) {
    const slug = pathname
      .replace(/^\/apis\/?/, '')
      .split('/')
      .filter(Boolean);
    return { type: 'api' as const, slug };
  }

  const slug =
    pathname === '/' ? [] : pathname.slice(1).split('/').filter(Boolean);
  return { type: 'docs' as const, slug };
}

export function App() {
  const { pathname } = useLocation();
  const { config } = usePageContext();
  const route = resolveRoute(pathname);
  const themeConfig = getThemeConfig(config.theme?.name);

  return (
    <ThemeProvider
      enableSystem={themeConfig.enableSystem}
      forcedTheme={themeConfig.forcedTheme}
    >
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
  );
}

function RootHead({ config }: { config: ChronicleConfig }) {
  return (
    <Head
      title={config.title}
      description={config.description}
      config={config}
      jsonLd={
        config.url
          ? {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: config.title,
              description: config.description,
              url: config.url
            }
          : undefined
      }
    />
  );
}
