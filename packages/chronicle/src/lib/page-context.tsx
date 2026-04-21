import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState
} from 'react';
import { useLocation } from 'react-router';
import type { ApiSpec } from '@/lib/openapi';
import { resolveRoute, RouteType } from '@/lib/route-resolver';
import type { VersionContext } from '@/lib/version-source';
import { LATEST_CONTEXT } from '@/lib/version-source';
import type { ChronicleConfig, Frontmatter, Root, TableOfContents } from '@/types';

export type MdxLoader = (relativePath: string) => Promise<{ content: ReactNode; toc: TableOfContents }>;

interface PageData {
  slug: string[];
  frontmatter: Frontmatter;
  content: ReactNode;
  toc: TableOfContents;
}

interface PageContextValue {
  config: ChronicleConfig;
  tree: Root;
  page: PageData | null;
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
  initialPage: PageData | null;
  initialApiSpecs: ApiSpec[];
  initialVersion: VersionContext;
  loadMdx: MdxLoader;
  children: ReactNode;
}

function getInitialErrorStatus(
  page: PageData | null,
  config: ChronicleConfig,
  pathname: string,
): number | null {
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
  const [page, setPage] = useState<PageData | null>(initialPage);
  const [errorStatus, setErrorStatus] = useState<number | null>(
    getInitialErrorStatus(initialPage, initialConfig, pathname),
  );
  const [apiSpecs, setApiSpecs] = useState<ApiSpec[]>(initialApiSpecs);
  const [version, setVersion] = useState<VersionContext>(initialVersion);
  const [currentPath, setCurrentPath] = useState(pathname);

  useEffect(() => {
    if (pathname === currentPath) return;
    setCurrentPath(pathname);

    const route = resolveRoute(pathname, initialConfig);
    if (route.type !== RouteType.Redirect) setVersion(route.version);

    const cancelled = { current: false };

    if (route.type === RouteType.ApiIndex || route.type === RouteType.ApiPage) {
      setPage(null);
      setErrorStatus(null);
      const specsUrl = route.version.dir
        ? `/api/specs?version=${encodeURIComponent(route.version.dir)}`
        : '/api/specs';
      fetch(specsUrl)
        .then(res => res.json())
        .then(specs => {
          if (!cancelled.current) setApiSpecs(specs);
        })
        .catch(() => {
          // swallow — api specs are best-effort on client nav
        });
      return () => { cancelled.current = true; };
    }

    if (route.type !== RouteType.DocsPage) {
      setPage(null);
      setErrorStatus(null);
      return () => { cancelled.current = true; };
    }

    const apiPath = route.slug.length === 0
      ? '/api/page'
      : `/api/page?slug=${route.slug.join(',')}`;

    fetch(apiPath)
      .then(res => {
        if (!res.ok) {
          if (!cancelled.current) {
            setPage(null);
            setErrorStatus(res.status);
          }
          return;
        }
        return res.json();
      })
      .then(async (data: { frontmatter: Frontmatter; relativePath: string; originalPath?: string } | undefined) => {
        if (cancelled.current || !data) return;
        const { content, toc } = await loadMdx(data.originalPath || data.relativePath);
        if (cancelled.current) return;
        setErrorStatus(null);
        setPage({ slug: route.slug, frontmatter: data.frontmatter, content, toc });
      })
      .catch(() => {
        if (!cancelled.current) {
          setPage(null);
          setErrorStatus(500);
        }
      });

    return () => { cancelled.current = true; };
  }, [pathname]);

  return (
    <PageContext.Provider
      value={{ config: initialConfig, tree, page, errorStatus, apiSpecs, version }}
    >
      {children}
    </PageContext.Provider>
  );
}
