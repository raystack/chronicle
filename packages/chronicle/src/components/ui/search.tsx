import {
  DocumentIcon,
  HashtagIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { Command, IconButton, Text } from '@raystack/apsara';
import type { SortedResult } from 'fumadocs-core/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { MethodBadge } from '@/components/api/method-badge';
import { usePageContext } from '@/lib/page-context';
import styles from './search.module.css';

interface SearchProps {
  className?: string;
}

export function Search({ className }: SearchProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { version } = usePageContext();

  const { search, setSearch, query } = useDocsSearch({
    type: 'fetch',
    api: '/api/search',
    tag: version.dir ?? undefined,
    delayMs: 100,
    allowEmpty: true
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

  const results = deduplicateByUrl(
    query.data === 'empty' ? [] : (query.data ?? [])
  );

  return (
    <>
      <IconButton
        size={3}
        aria-label='Search'
        title='Search (Ctrl/⌘K)'
        onClick={() => setOpen(true)}
        className={className}
      >
        <MagnifyingGlassIcon width={16} height={16} />
      </IconButton>

      <Command.Dialog open={open} onOpenChange={setOpen}>
        <Command.DialogContent className={styles.dialogContent}>
          <Command>
            <Command.Input
              placeholder='Search'
              leadingIcon={<MagnifyingGlassIcon width={16} height={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.input}
            />

            <Command.Content className={styles.list}>
              {query.isLoading && <Command.Empty>Loading...</Command.Empty>}
              {!query.isLoading &&
                search.length > 0 &&
                results.length === 0 && (
                  <Command.Empty>No results found.</Command.Empty>
                )}
              {!query.isLoading &&
                search.length === 0 &&
                results.length > 0 && (
                  <Command.Group>
                    <Command.Label>Suggestions</Command.Label>
                    {results.slice(0, 8).map((result: SortedResult) => (
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
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              {search.length > 0 &&
                results.map((result: SortedResult) => (
                  <Command.Item
                    key={result.id}
                    value={result.id}
                    onClick={() => onSelect(result.url)}
                    className={styles.item}
                  >
                    <div className={styles.itemContent}>
                      {getResultIcon(result)}
                      <div className={styles.resultText}>
                        {result.type === 'heading' ? (
                          <>
                            <Text className={styles.headingText}>
                              <HighlightedText
                                html={stripMethod(result.content)}
                              />
                            </Text>
                            <Text className={styles.separator}>-</Text>
                            <Text className={styles.pageText}>
                              {getPageTitle(result.url)}
                            </Text>
                          </>
                        ) : (
                          <Text className={styles.pageText}>
                            <HighlightedText
                              html={stripMethod(result.content)}
                            />
                          </Text>
                        )}
                      </div>
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

function deduplicateByUrl(results: SortedResult[]): SortedResult[] {
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

function getResultIcon(result: SortedResult): React.ReactNode {
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
