import {
  DocumentIcon,
  HashtagIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { Badge, Command, IconButton, Text } from '@raystack/apsara';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { MethodBadge } from '@/components/api/method-badge';
import { usePageContext } from '@/lib/page-context';
import styles from './search.module.css';

interface SearchResult {
  id: string;
  url: string;
  type: string;
  content: string;
  match?: 'title' | 'heading' | 'body';
  snippet?: string;
  section?: string;
}

interface SearchProps {
  classNames?: { trigger?: string };
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

  const { data = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['search', debouncedSearch, tag],
    queryFn: async ({ signal }) => {
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
                        <div className={styles.itemContent}>
                          {getResultIcon(result)}
                          <Text className={styles.pageText}>
                            <HighlightedText
                              html={stripMethod(result.content)}
                            />
                          </Text>
                          {result.section && <Badge size="small" className={styles.sectionBadge}>{result.section}</Badge>}
                        </div>
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
                    <div className={styles.itemContent}>
                      {getResultIcon(result)}
                      <div className={styles.resultText}>
                        <Text className={styles.pageText}>
                          <HighlightQuery text={stripMethod(result.content)} query={search} />
                        </Text>
                        {result.snippet && result.match === 'heading' && (
                          <Text className={styles.snippetText}>
                            # <HighlightQuery text={result.snippet} query={search} />
                          </Text>
                        )}
                        {result.snippet && result.match === 'body' && (
                          <Text className={styles.snippetText}>
                            <HighlightQuery text={result.snippet} query={search} />
                          </Text>
                        )}
                      </div>
                      {result.section && <Badge size="small" className={styles.sectionBadge}>{result.section}</Badge>}
                    </div>
                  </Command.Item>
                ))}
            </Command.Content>
          </Command>
        </Command.DialogContent>
      </Command.Dialog>
    </>
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
  if (!result.url.startsWith('/apis/')) {
    return result.type === 'page' ? (
      <DocumentIcon className={styles.icon} />
    ) : (
      <HashtagIcon className={styles.icon} />
    );
  }
  const method = extractMethod(result.content);
  return method ? <MethodBadge method={method} size='micro' /> : null;
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
