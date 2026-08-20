import { ThemeProvider, Skeleton, Flex } from '@raystack/apsara';
import { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';
import { SearchDialog, SearchProvider } from '@/components/ui/search';
import { usePageContext } from '@/lib/page-context';
import { isAuthorRoute, resolveRoute, RouteType } from '@/lib/route-resolver';
import type { ChronicleConfig } from '@/types';
import { getThemeConfig } from '@/themes/registry';
import styles from './App.module.css';

const ApiLayout = lazy(() => import('@/pages/ApiLayout').then(m => ({ default: m.ApiLayout })));
const ApiPage = lazy(() => import('@/pages/ApiPage').then(m => ({ default: m.ApiPage })));
const DocsLayout = lazy(() => import('@/pages/DocsLayout').then(m => ({ default: m.DocsLayout })));
const DocsPage = lazy(() => import('@/pages/DocsPage').then(m => ({ default: m.DocsPage })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AuthorsPage = lazy(() => import('@/pages/AuthorsPage').then(m => ({ default: m.AuthorsPage })));
const AuthorDetailPage = lazy(() => import('@/pages/AuthorsPage').then(m => ({ default: m.AuthorDetailPage })));

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
  const isAuthors = isAuthorRoute(route);

  return (
    <ThemeProvider
      enableSystem={themeConfig.enableSystem}
      forcedTheme={themeConfig.forcedTheme}
    >
      <AnalyticsProvider config={config.analytics ?? { enabled: false }} appName={config.site.title}>
        <SearchProvider>
          <RootHead config={config} />
          {config.search?.enabled && <SearchDialog />}
          <Suspense fallback={<PageFallback />}>
            {isApi ? (
              <ApiLayout>
                <ApiPage slug={apiSlug} />
              </ApiLayout>
            ) : isAuthors ? (
              <DocsLayout hideSidebar>
                {route.type === RouteType.AuthorPage ? (
                  <AuthorDetailPage authorSlug={route.authorSlug} />
                ) : (
                  <AuthorsPage />
                )}
              </DocsLayout>
            ) : (
              <DocsLayout hideSidebar={isLanding}>
                {isLanding ? <LandingPage /> : <DocsPage slug={docsSlug} />}
              </DocsLayout>
            )}
          </Suspense>
        </SearchProvider>
      </AnalyticsProvider>
    </ThemeProvider>
  );
}

function PageFallback() {
  return (
    <Flex direction="column" gap={4} className={styles.fallback}>
      <Skeleton width="40%" height="var(--rs-line-height-t2)" />
      <Skeleton width="60%" height="var(--rs-line-height-regular)" />
      {[...new Array(12)].map((_, i) => (
        <Skeleton key={i} width="100%" height="var(--rs-line-height-regular)" />
      ))}
    </Flex>
  );
}

function RootHead({ config }: { config: ChronicleConfig }) {
  const siteJsonLd = config.url
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: config.site.title,
        description: config.site.description,
        url: config.url,
      }
    : null;

  return (
    <>
      <title>{config.site.title}</title>
      {siteJsonLd && (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd, null, 2) }}
        />
      )}
    </>
  );
}
