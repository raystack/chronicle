import {
  DocumentIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  CodeBracketIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Command, IconButton, Text } from '@raystack/apsara';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import GithubSlugger from 'github-slugger';
import { debounce } from 'lodash-es';
import MiniSearch from 'minisearch';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { MethodBadge } from '@/components/api/method-badge';
import { usePageContext } from '@/lib/page-context';
import { SearchMatchType } from '@/types';
import styles from './search.module.css';

interface SearchResult {
  id: string;
  url: string;
  type: string;
  content: string;
  match?: SearchMatchType;
  snippet?: string;
  section?: string;
}

interface SearchProps {
  classNames?: { trigger?: string };
}

interface SearchDocument {
  id: string;
  url: string;
  title: string;
  headings: string;
  body: string;
  type: string;
  section: string;
}

function isStaticMode(): boolean {
  return typeof window !== 'undefined' && (window as unknown as { __STATIC_MODE__?: boolean }).__STATIC_MODE__ === true;
}

let miniSearchInstance: MiniSearch<SearchDocument> | null = null;
let miniSearchLoading: Promise<MiniSearch<SearchDocument>> | null = null;
let searchDocuments: SearchDocument[] = [];

function loadSearchIndex(): Promise<MiniSearch<SearchDocument>> {
  if (miniSearchInstance) return Promise.resolve(miniSearchInstance);
  if (miniSearchLoading) return miniSearchLoading;

  miniSearchLoading = fetch('/data/search.json')
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load search index: ${res.status}`);
      return res.json() as Promise<SearchDocument[]>;
    })
    .then(docs => {
      searchDocuments = docs;
      const ms = new MiniSearch<SearchDocument>({
        fields: ['title', 'headings', 'body'],
        storeFields: ['url', 'title', 'headings', 'body', 'type', 'section'],
        searchOptions: {
          boost: { title: 10, headings: 5, body: 1 },
          prefix: true,
          fuzzy: 0.2,
        },
      });
      ms.addAll(docs);
      miniSearchInstance = ms;
      return ms;
    })
    .catch(err => {
      miniSearchLoading = null;
      throw err;
    });

  return miniSearchLoading;
}

function findMatch(
  query: string,
  title: string,
  headings: string,
  body: string,
): { match: SearchMatchType; snippet: string; slug?: string } {
  if (title.toLowerCase().includes(query)) {
    return { match: SearchMatchType.Title, snippet: title };
  }

  const slugger = new GithubSlugger();
  const headingList = headings.split('\n').filter(Boolean);
  for (const h of headingList) {
    const slug = slugger.slug(h);
    if (h.toLowerCase().includes(query)) {
      return { match: SearchMatchType.Heading, snippet: h, slug };
    }
  }

  const idx = body.toLowerCase().indexOf(query);
  if (idx >= 0) {
    const start = Math.max(0, idx - 40);
    const end = Math.min(body.length, idx + query.length + 80);
    const snippet = (start > 0 ? '...' : '') + body.slice(start, end).trim() + (end < body.length ? '...' : '');
    return { match: SearchMatchType.Body, snippet };
  }

  return { match: SearchMatchType.Title, snippet: title };
}

async function searchStatic(query: string, tag?: string): Promise<SearchResult[]> {
  const ms = await loadSearchIndex();

  if (!query) {
    let docs = searchDocuments.filter(d => d.type === 'page');
    if (tag) docs = docs.filter(d => d.url === `/${tag}` || d.url.startsWith(`/${tag}/`));
    return docs.slice(0, 8).map(d => ({
      id: d.id,
      url: d.url,
      type: d.type,
      content: d.title,
      section: d.section || undefined,
    }));
  }

  let results = ms.search(query);
  if (tag) {
    results = results.filter(r => {
      const url = r.url as string;
      return url === `/${tag}` || url.startsWith(`/${tag}/`);
    });
  }

  const queryLower = query.toLowerCase();
  return results.slice(0, 20).map(r => {
    const { match, snippet, slug } = findMatch(
      queryLower,
      r.title as string,
      r.headings as string,
      r.body as string,
    );
    const id = match === SearchMatchType.Heading && slug ? `${r.id}#${slug}` : r.id as string;
    const url = match === SearchMatchType.Heading && slug ? `${r.url}#${slug}` : r.url as string;
    return {
      id,
      url,
      type: r.type as string,
      content: r.title as string,
      match,
      snippet,
      section: (r.section as string) || undefined,
    };
  });
}

function buildSearchUrl(query: string, tag?: string): string {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (tag) params.set('tag', tag);
  const qs = params.toString();
  return qs ? `/api/search?${qs}` : '/api/search';
}

export function Search({ classNames }: SearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigate = useNavigate();
  const { version } = usePageContext();
  const tag = version.dir ?? undefined;

  const updateDebouncedSearch = useMemo(
    () => debounce((value: string) => setDebouncedSearch(value), 150),
    []
  );

  const onSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    updateDebouncedSearch(value);
  }, [updateDebouncedSearch]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
      updateDebouncedSearch.cancel();
    }
  }, [open, updateDebouncedSearch]);

  const staticMode = isStaticMode();

  const { data = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['search', debouncedSearch, tag, staticMode],
    queryFn: async ({ signal }) => {
      if (staticMode) {
        return searchStatic(debouncedSearch, tag);
      }
      const res = await fetch(buildSearchUrl(debouncedSearch, tag), { signal });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    enabled: open,
    placeholderData: keepPreviousData,
  });

  const onSelect = useCallback(
    (url: string) => {
      setOpen(false);
      navigate(url);
    },
    [navigate]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const displayResults = deduplicateByUrl(data);

  return (
    <>
      <IconButton
        size={3}
        aria-label='Search'
        title='Search (Ctrl/⌘K)'
        onClick={() => setOpen(true)}
        className={classNames?.trigger}
      >
        <MagnifyingGlassIcon width={16} height={16} />
      </IconButton>

      <Command.Dialog open={open} onOpenChange={setOpen}>
        <Command.DialogContent className={styles.dialogContent}>
          <Command items={displayResults}>
            <Command.Input
              placeholder='Search'
              leadingIcon={<MagnifyingGlassIcon width={16} height={16} />}
              value={search}
              onChange={onSearchChange}
              className={styles.input}
            />

            <Command.Content className={styles.list}>
              {isLoading && displayResults.length === 0 && <Command.Empty>Loading...</Command.Empty>}
              {!isLoading &&
                search.length > 0 &&
                displayResults.length === 0 && (
                  <Command.Empty>No results found.</Command.Empty>
                )}
              {search.length === 0 &&
                displayResults.length > 0 && (
                  <Command.Group>
                    <Command.Label>Suggestions</Command.Label>
                    {displayResults.slice(0, 8).map((result) => (
                      <Command.Item
                        key={result.id}
                        value={result.id}
                        onClick={() => onSelect(result.url)}
                        className={styles.item}
                      >
                        <SearchResultItem result={result} query="" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              {search.length > 0 &&
                displayResults.map((result) => (
                  <Command.Item
                    key={result.id}
                    value={result.id}
                    onClick={() => onSelect(result.url)}
                    className={styles.item}
                  >
                    <SearchResultItem result={result} query={search} />
                  </Command.Item>
                ))}
            </Command.Content>
          </Command>
        </Command.DialogContent>
      </Command.Dialog>
    </>
  );
}

function SearchResultItem({ result, query }: { result: SearchResult; query: string }) {
  const method = extractMethod(result.content);
  const title = stripMethod(result.content);

  return (
    <div className={styles.itemContent}>
      {getResultIcon(result)}
      <div className={styles.resultText}>
        <div className={styles.breadcrumb}>
          {result.section && (
            <>
              <span className={styles.breadcrumbText}>{result.section}</span>
              <ChevronRightIcon width={12} height={12} className={styles.breadcrumbSeparator} />
            </>
          )}
          {method && <MethodBadge method={method} size='micro' />}
          <Text className={styles.breadcrumbText}>
            {query ? <HighlightQuery text={title} query={query} /> : <HighlightedText html={title} />}
          </Text>
        </div>
        {result.snippet && (
          <Text className={styles.snippetText}>
            {query
              ? <HighlightQuery text={result.snippet} query={query} />
              : result.snippet}
          </Text>
        )}
      </div>
    </div>
  );
}

function deduplicateByUrl(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    const base = r.url.split('#')[0];
    if (seen.has(base)) return false;
    seen.add(base);
    return true;
  });
}

const API_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

function extractMethod(content: string): string | null {
  const first = content.split(' ')[0];
  return API_METHODS.has(first) ? first : null;
}

function stripMethod(content: string): string {
  const first = content.split(' ')[0];
  return API_METHODS.has(first) ? content.slice(first.length + 1) : content;
}

function HighlightedText({
  html,
  className
}: {
  html: string;
  className?: string;
}) {
  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function HighlightQuery({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className={styles.matchHighlight}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function getResultIcon(result: SearchResult): React.ReactNode {
  if (result.url.startsWith('/apis/')) {
    return <CodeBracketIcon className={styles.icon} />;
  }
  if (result.match === SearchMatchType.Heading) {
    return <HashtagIcon className={styles.icon} />;
  }
  return <DocumentIcon className={styles.icon} />;
}

function getPageTitle(url: string): string {
  const path = url.split('#')[0];
  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) return 'Home';
  return lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
