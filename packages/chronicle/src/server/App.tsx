import '@raystack/apsara/normalize.css';
import '@raystack/apsara/style.css';
import { ThemeProvider } from '@raystack/apsara';
import { Navigate, useLocation } from 'react-router';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import { resolveRoute, RouteType } from '@/lib/route-resolver';
import { ApiLayout } from '@/pages/ApiLayout';
import { ApiPage } from '@/pages/ApiPage';
import { DocsLayout } from '@/pages/DocsLayout';
import { DocsPage } from '@/pages/DocsPage';
import { LandingPage } from '@/pages/LandingPage';
import type { ChronicleConfig } from '@/types';
import { getThemeConfig } from '@/themes/registry';

export function App() {
  const { pathname } = useLocation();
  const { config } = usePageContext();
  const route = resolveRoute(pathname, config);
  const themeConfig = getThemeConfig(config.theme?.name);

  if (route.type === RouteType.Redirect) {
    return <Navigate to={route.to} replace />;
  }

  const isApi =
    route.type === RouteType.ApiIndex || route.type === RouteType.ApiPage;
  const apiSlug = route.type === RouteType.ApiPage ? route.slug : [];
  const docsSlug = route.type === RouteType.DocsPage ? route.slug : [];
  const isLanding = route.type === RouteType.DocsIndex;

  return (
    <ThemeProvider
      enableSystem={themeConfig.enableSystem}
      forcedTheme={themeConfig.forcedTheme}
    >
      <RootHead config={config} />
      {isApi ? (
        <ApiLayout>
          <ApiPage slug={apiSlug} />
        </ApiLayout>
      ) : (
        <DocsLayout hideSidebar={isLanding}>
          {isLanding ? <LandingPage /> : <DocsPage slug={docsSlug} />}
        </DocsLayout>
      )}
    </ThemeProvider>
  );
}

function RootHead({ config }: { config: ChronicleConfig }) {
  return (
    <Head
      title={config.site.title}
      description={config.site.description}
      config={config}
      jsonLd={
        config.url
          ? {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: config.site.title,
              description: config.site.description,
              url: config.url
            }
          : undefined
      }
    />
  );
}
