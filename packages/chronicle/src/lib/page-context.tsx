import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { ApiSpec } from '@/lib/openapi';
import { resolveRoute, resolveContentRootRedirect, RouteType } from '@/lib/route-resolver';
import { isStaticMode } from '@/lib/static-mode';
import { pageDataUrl, specsUrl } from '@/lib/data-urls';
import type { VersionContext } from '@/lib/version-source';
import { LATEST_CONTEXT } from '@/lib/version-source';
import type { ChronicleConfig, Frontmatter, Page, PageNavLink, Root, TableOfContents } from '@/types';
import { queryClient } from '@/lib/preload';
import { isLocalImage, isSvg, buildOptimizedUrl, splitVersion, webpUrl, DEFAULT_WIDTH } from '@/lib/image-utils';

export type MdxLoader = (relativePath: string) => Promise<{ content: ReactNode; toc: TableOfContents }>;

interface PageContextValue {
  config: ChronicleConfig;
  tree: Root;
  page: Page | null;
  isLoading: boolean;
  errorStatus: number | null;
  /** Render/load failure detail (e.g. MDX compile error) — non-status errors only. */
  errorMessage: string | null;
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
      errorMessage: null,
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
  const navigate = useNavigate();
  const [tree] = useState<Root>(initialTree);
  const [page, setPage] = useState<Page | null>(initialPage);
  const [errorStatus, setErrorStatus] = useState<number | null>(getInitialErrorStatus(initialPage, initialConfig, pathname));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiSpecs, setApiSpecs] = useState<ApiSpec[]>(initialApiSpecs);
  const [version, setVersion] = useState<VersionContext>(initialVersion);
  const [isLoading, setIsLoading] = useState(false);
  const currentPathRef = useRef(pathname);

  const fetchApiSpecs = useCallback(async (route: { version: VersionContext }, cancelled: { current: boolean }) => {
    setIsLoading(true);
    try {
      const url = specsUrl(route.version.dir);
      const res = await fetch(url);
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
    const apiPath = pageDataUrl(slug);
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
          const { base, version } = splitVersion(src);
          if (isLocalImage(base) && !isSvg(base)) {
            img.src = isStaticMode()
              ? webpUrl(src)
              : buildOptimizedUrl(base, DEFAULT_WIDTH, undefined, version);
          } else {
            img.src = src;
          }
        }
      }
      const { content, toc } = await loadMdx(data.originalPath || data.relativePath);
      if (cancelled.current) return;
      setErrorStatus(null);
      setErrorMessage(null);
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
      const raw = (err as Error).message;
      const status = Number(raw) || 500;
      setPage(null);
      setErrorStatus(status);
      setErrorMessage(Number(raw) ? null : raw);
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
      setErrorMessage(null);
      fetchApiSpecs(route, cancelled);
      return () => { cancelled.current = true; };
    }

    if (route.type !== RouteType.DocsPage) {
      setPage(null);
      setErrorStatus(null);
      setErrorMessage(null);
      return () => { cancelled.current = true; };
    }

    if (isStaticMode()) {
      const redirect = resolveContentRootRedirect(route.slug, initialConfig);
      if (redirect) {
        navigate(redirect, { replace: true });
        return () => { cancelled.current = true; };
      }
    }

    setPage(null);
    setErrorStatus(null);
    setErrorMessage(null);
    loadDocsPage(route.slug, cancelled);
    return () => { cancelled.current = true; };
  }, [pathname, initialConfig, fetchApiSpecs, loadDocsPage, navigate]);

  return (
    <PageContext.Provider
      value={{ config: initialConfig, tree, page, isLoading, errorStatus, errorMessage, apiSpecs, version }}
    >
      {children}
    </PageContext.Provider>
  );
}
