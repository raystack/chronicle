import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState
} from 'react';
import { useLocation } from 'react-router';
import { mdxComponents } from '@/components/mdx';
import type { ApiSpec } from '@/lib/openapi';
import type { ChronicleConfig, Frontmatter, Root } from '@/types';

interface PageData {
  slug: string[];
  frontmatter: Frontmatter;
  content: ReactNode;
}

interface PageContextValue {
  config: ChronicleConfig;
  tree: Root;
  page: PageData | null;
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
  children: ReactNode;
}

const contentModules = import.meta.glob<{ default?: React.ComponentType<any> }>(
  '../../.content/**/*.{mdx,md}'
);

async function loadMdxComponent(relativePath: string): Promise<ReactNode> {
  const withoutExt = relativePath.replace(/\.(mdx|md)$/, '');
  const key = relativePath.endsWith('.md')
    ? `../../.content/${withoutExt}.md`
    : `../../.content/${withoutExt}.mdx`;
  const loader = contentModules[key];
  if (!loader) return null;
  const mod = await loader();
  return mod.default
    ? React.createElement(mod.default, { components: mdxComponents })
    : null;
}

export function PageProvider({
  initialConfig,
  initialTree,
  initialPage,
  initialApiSpecs,
  children
}: PageProviderProps) {
  const { pathname } = useLocation();
  const [tree] = useState<Root>(initialTree);
  const [page, setPage] = useState<PageData | null>(initialPage);
  const [apiSpecs, setApiSpecs] = useState<ApiSpec[]>(initialApiSpecs);
  const [currentPath, setCurrentPath] = useState(pathname);

  useEffect(() => {
    if (pathname === currentPath) return;
    setCurrentPath(pathname);

    const cancelled = { current: false };

    if (pathname.startsWith('/apis')) {
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

    const apiPath = slug.length === 0 ? '/api/page/' : `/api/page/${slug.join('/')}`;

    fetch(apiPath)
      .then(res => res.json())
      .then(async (data: { frontmatter: Frontmatter; relativePath: string }) => {
        if (cancelled.current) return;
        const content = await loadMdxComponent(data.relativePath);
        if (cancelled.current) return;
        setPage({ slug, frontmatter: data.frontmatter, content });
      })
      .catch(() => {});

    return () => { cancelled.current = true; };
  }, [pathname]);

  return (
    <PageContext.Provider
      value={{ config: initialConfig, tree, page, apiSpecs }}
    >
      {children}
    </PageContext.Provider>
  );
}
