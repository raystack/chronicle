import { QueryClient } from '@tanstack/react-query';
import { isStaticMode } from '@/lib/static-mode';
import { pageDataUrl } from '@/lib/data-urls';

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
  const apiPath = pageDataUrl(slug);
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

export function prefetchSearchSuggestions() {
  if (isStaticMode()) return;
  queryClient.prefetchQuery({
    queryKey: ['search', '', undefined],
    queryFn: async () => {
      const res = await fetch('/api/search');
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
  });
}
