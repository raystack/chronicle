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
import type { ChronicleConfig, Frontmatter, PageTree } from '@/types';

interface PageData {
  slug: string[];
  frontmatter: Frontmatter;
  content: ReactNode;
}

interface PageContextValue {
  config: ChronicleConfig;
  tree: PageTree;
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
      tree: { name: 'root', children: [] },
      page: null,
      apiSpecs: []
    };
  }
  return ctx;
}

interface PageProviderProps {
  initialConfig: ChronicleConfig;
  initialTree: PageTree;
  initialPage: PageData | null;
  initialApiSpecs: ApiSpec[];
  children: ReactNode;
}

async function loadMdxComponent(relativePath: string): Promise<ReactNode> {
  const withoutExt = relativePath.replace(/\.(mdx|md)$/, '');
  const mod = relativePath.endsWith('.md')
    ? await import(`../../.content/${withoutExt}.md`)
    : await import(`../../.content/${withoutExt}.mdx`);
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
  const [tree] = useState<PageTree>(initialTree);
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
