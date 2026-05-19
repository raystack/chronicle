import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  },
});

export function pageDataQueryKey(pathname: string) {
  const slug = pathname.split('/').filter(Boolean);
  const key = slug.length === 0 ? '' : slug.map(s => encodeURIComponent(s)).join(',');
  return ['pageData', key] as const;
}

async function fetchPageDataByPathname(pathname: string) {
  const slug = pathname.split('/').filter(Boolean);
  const key = slug.length === 0 ? '' : slug.map(s => encodeURIComponent(s)).join(',');
  const apiPath = key ? `/api/page?slug=${key}` : '/api/page';
  const res = await fetch(apiPath);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function isApisRoute(pathname: string): boolean {
  return pathname === '/apis' || pathname.startsWith('/apis/');
}

function hasFileExtension(pathname: string): boolean {
  const lastSegment = pathname.split('/').pop() ?? '';
  return lastSegment.includes('.');
}

export function prefetchPageData(pathname: string) {
  if (isApisRoute(pathname) || hasFileExtension(pathname)) return;
  queryClient.prefetchQuery({
    queryKey: pageDataQueryKey(pathname),
    queryFn: () => fetchPageDataByPathname(pathname),
  });
}
