import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState
} from 'react';
import { useLocation } from 'react-router';
import type { ApiSpec } from '@/lib/openapi';
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
}

const PageContext = createContext<PageContextValue | null>(null);

export function usePageContext(): PageContextValue {
  const ctx = useContext(PageContext);
  if (!ctx) {
    console.error('usePageContext: no context found!');
    return {
      config: { title: 'Documentation' },
      tree: { name: 'root', children: [] } as Root,
      page: null,
      errorStatus: null,
      apiSpecs: []
    };
  }
  return ctx;
}

interface PageProviderProps {
  initialConfig: ChronicleConfig;
  initialTree: Root;
  initialPage: PageData | null;
  initialApiSpecs: ApiSpec[];
  loadMdx: MdxLoader;
  children: ReactNode;
}

function isApisRoute(pathname: string): boolean {
  return pathname === '/apis' || pathname.startsWith('/apis/');
}

function getInitialErrorStatus(page: PageData | null, pathname: string): number | null {
  if (page) return null;
  if (pathname === '/' || isApisRoute(pathname)) return null;
  return 404;
}

export function PageProvider({
  initialConfig,
  initialTree,
  initialPage,
  initialApiSpecs,
  loadMdx,
  children
}: PageProviderProps) {
  const { pathname } = useLocation();
  const [tree] = useState<Root>(initialTree);
  const [page, setPage] = useState<PageData | null>(initialPage);
  const [errorStatus, setErrorStatus] = useState<number | null>(getInitialErrorStatus(initialPage, pathname));
  const [apiSpecs, setApiSpecs] = useState<ApiSpec[]>(initialApiSpecs);
  const [currentPath, setCurrentPath] = useState(pathname);

  useEffect(() => {
    if (pathname === currentPath) return;
    setCurrentPath(pathname);

    const cancelled = { current: false };

    if (isApisRoute(pathname)) {
      if (apiSpecs.length === 0) {
        fetch('/api/specs')
          .then(res => res.json())
          .then(specs => {
            if (!cancelled.current) setApiSpecs(specs);
          })
          .catch(() => {});
      }
      return () => { cancelled.current = true; };
    }

    const slug = pathname === '/'
      ? []
      : pathname.slice(1).split('/').filter(Boolean);

    const apiPath = slug.length === 0 ? '/api/page' : `/api/page?slug=${slug.join(',')}`;

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
        setPage({ slug, frontmatter: data.frontmatter, content, toc });
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
      value={{ config: initialConfig, tree, page, errorStatus, apiSpecs }}
    >
      {children}
    </PageContext.Provider>
  );
}
