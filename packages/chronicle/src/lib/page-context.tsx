import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { useLocation } from 'react-router';
import type { ApiSpec } from '@/lib/openapi';
import { resolveRoute, RouteType } from '@/lib/route-resolver';
import type { VersionContext } from '@/lib/version-source';
import { LATEST_CONTEXT } from '@/lib/version-source';
import type { ChronicleConfig, Frontmatter, Page, PageNavLink, Root, TableOfContents } from '@/types';
import { queryClient } from '@/lib/preload';

export type MdxLoader = (relativePath: string) => Promise<{ content: ReactNode; toc: TableOfContents }>;

interface PageContextValue {
  config: ChronicleConfig;
  tree: Root;
  page: Page | null;
  isLoading: boolean;
  errorStatus: number | null;
  apiSpecs: ApiSpec[];
  version: VersionContext;
}

const PageContext = createContext<PageContextValue | null>(null);

export function usePageContext(): PageContextValue {
  const ctx = useContext(PageContext);
  if (!ctx) {
    console.error('usePageContext: no context found!');
    return {
      config: {
        site: { title: 'Documentation' },
        content: [{ dir: 'docs', label: 'Docs' }],
      },
      tree: { name: 'root', children: [] } as Root,
      page: null,
      isLoading: false,
      errorStatus: null,
      apiSpecs: [],
      version: LATEST_CONTEXT,
    };
  }
  return ctx;
}

interface PageProviderProps {
  initialConfig: ChronicleConfig;
  initialTree: Root;
  initialPage: Page | null;
  initialApiSpecs: ApiSpec[];
  initialVersion: VersionContext;
  loadMdx: MdxLoader;
  children: ReactNode;
}

function isApisRoute(pathname: string): boolean {
  return pathname === '/apis' || pathname.startsWith('/apis/');
}

function getInitialErrorStatus(page: Page | null, config: ChronicleConfig, pathname: string): number | null {
  if (page) return null;
  const route = resolveRoute(pathname, config);
  if (route.type === RouteType.ApiIndex || route.type === RouteType.ApiPage) return null;
  if (route.type === RouteType.Redirect) return null;
  if (route.type === RouteType.DocsIndex) return null;
  return 404;
}

export function PageProvider({
  initialConfig,
  initialTree,
  initialPage,
  initialApiSpecs,
  initialVersion,
  loadMdx,
  children
}: PageProviderProps) {
  const { pathname } = useLocation();
  const [tree] = useState<Root>(initialTree);
  const [page, setPage] = useState<Page | null>(initialPage);
  const [errorStatus, setErrorStatus] = useState<number | null>(getInitialErrorStatus(initialPage, initialConfig, pathname));
  const [apiSpecs, setApiSpecs] = useState<ApiSpec[]>(initialApiSpecs);
  const [version, setVersion] = useState<VersionContext>(initialVersion);
  const [isLoading, setIsLoading] = useState(false);
  const currentPathRef = useRef(pathname);

  const fetchApiSpecs = useCallback(async (route: { version: VersionContext }, cancelled: { current: boolean }) => {
    setIsLoading(true);
    try {
      const specsUrl = route.version.dir
        ? `/api/specs?version=${encodeURIComponent(route.version.dir)}`
        : '/api/specs';
      const res = await fetch(specsUrl);
      const specs = await res.json();
      if (!cancelled.current) setApiSpecs(specs);
    } catch {
      // best-effort on client nav
    } finally {
      setIsLoading(false);
    }
  }, []);

  interface PageData {
    frontmatter: Frontmatter;
    relativePath: string;
    originalPath?: string;
    images?: string[];
    prev?: PageNavLink | null;
    next?: PageNavLink | null;
  }

  const fetchPageData = useCallback(async (slug: string[]): Promise<PageData> => {
    const key = slug.length === 0 ? '' : slug.map(s => encodeURIComponent(s)).join(',');
    const apiPath = key ? `/api/page?slug=${key}` : '/api/page';
    return queryClient.fetchQuery({
      queryKey: ['pageData', key],
      queryFn: async () => {
        const res = await fetch(apiPath);
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      },
    });
  }, []);

  const loadDocsPage = useCallback(async (slug: string[], cancelled: { current: boolean }) => {
    setIsLoading(true);
    try {
      const data = await fetchPageData(slug);
      if (cancelled.current) return;
      if (data.images?.length) {
        for (const src of data.images) {
          const img = new Image();
          img.src = src;
        }
      }
      const { content, toc } = await loadMdx(data.originalPath || data.relativePath);
      if (cancelled.current) return;
      setErrorStatus(null);
      setPage({
        slug,
        frontmatter: data.frontmatter,
        content,
        toc,
        prev: data.prev ?? null,
        next: data.next ?? null,
      });
    } catch (err) {
      if (cancelled.current) return;
      const status = Number((err as Error).message) || 500;
      setPage(null);
      setErrorStatus(status);
    } finally {
      if (!cancelled.current) setIsLoading(false);
    }
  }, [fetchPageData, loadMdx]);

  useEffect(() => {
    if (pathname === currentPathRef.current) return;
    currentPathRef.current = pathname;

    const route = resolveRoute(pathname, initialConfig);
    if (route.type !== RouteType.Redirect) setVersion(route.version);

    const cancelled = { current: false };

    if (route.type === RouteType.ApiIndex || route.type === RouteType.ApiPage) {
      setPage(null);
      setErrorStatus(null);
      fetchApiSpecs(route, cancelled);
      return () => { cancelled.current = true; };
    }

    if (route.type !== RouteType.DocsPage) {
      setPage(null);
      setErrorStatus(null);
      return () => { cancelled.current = true; };
    }

    setPage(null);
    setErrorStatus(null);
    loadDocsPage(route.slug, cancelled);
    return () => { cancelled.current = true; };
  }, [pathname, initialConfig, fetchApiSpecs, loadDocsPage]);

  return (
    <PageContext.Provider
      value={{ config: initialConfig, tree, page, isLoading, errorStatus, apiSpecs, version }}
    >
      {children}
    </PageContext.Provider>
  );
}
