import { QueryClient } from '@tanstack/react-query';

function isStaticMode(): boolean {
  return typeof window !== 'undefined' && (window as any).__STATIC_MODE__ === true;
}

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
  let apiPath: string;
  if (isStaticMode()) {
    const file = key || 'index';
    apiPath = `/data/pages/${file}.json`;
  } else {
    apiPath = key ? `/api/page?slug=${key}` : '/api/page';
  }
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
