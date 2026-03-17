"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Command, Dialog, Text } from "@raystack/apsara";
import { cx } from "class-variance-authority";
import { DocumentIcon, HashtagIcon } from "@heroicons/react/24/outline";
import { MethodBadge } from "@/components/api/method-badge";
import styles from "./search.module.css";

interface SearchResult {
  id: string;
  url: string;
  type: "page" | "api";
  content: string;
}

function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        const res = await fetch(`/api/search?${params}`);
        if (!cancelled) setResults(await res.json());
      } catch {
        if (!cancelled) setResults([]);
      }
      if (!cancelled) setIsLoading(false);
    }, 100);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { results, isLoading };
}

function SearchShortcutKey({ className }: { className?: string }) {
  const [key, setKey] = useState("\u2318");

  useEffect(() => {
    setKey(navigator.platform?.startsWith("Mac") ? "\u2318" : "Ctrl");
  }, []);

  return (
    <kbd className={className} suppressHydrationWarning>
      {key} K
    </kbd>
  );
}

interface SearchProps {
  className?: string;
}

export function Search({ className }: SearchProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { results, isLoading } = useSearch(search);

  const onSelect = useCallback(
    (url: string) => {
      setOpen(false);
      navigate(url);
    },
    [navigate],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        color="neutral"
        size="small"
        onClick={() => setOpen(true)}
        className={cx(styles.trigger, className)}
        trailingIcon={<SearchShortcutKey className={styles.kbd} />}
      >
        Search...
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Content className={styles.dialogContent}>
          <Dialog.Title className={styles.visuallyHidden}>
            Search documentation
          </Dialog.Title>
          <Command loop>
            <Command.Input
              placeholder="Search"
              value={search}
              onValueChange={setSearch}
              className={styles.input}
            />

            <Command.List className={styles.list}>
              {isLoading && <Command.Empty>Loading...</Command.Empty>}
              {!isLoading &&
                search.length > 0 &&
                results.length === 0 && (
                  <Command.Empty>No results found.</Command.Empty>
                )}
              {!isLoading &&
                search.length === 0 &&
                results.length > 0 && (
                  <Command.Group heading="Suggestions">
                    {results.slice(0, 8).map((result) => (
                      <Command.Item
                        key={result.id}
                        value={result.id}
                        onSelect={() => onSelect(result.url)}
                        className={styles.item}
                      >
                        <div className={styles.itemContent}>
                          {getResultIcon(result)}
                          <Text className={styles.pageText}>
                            {result.content}
                          </Text>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              {search.length > 0 &&
                results.map((result) => (
                  <Command.Item
                    key={result.id}
                    value={result.id}
                    onSelect={() => onSelect(result.url)}
                    className={styles.item}
                  >
                    <div className={styles.itemContent}>
                      {getResultIcon(result)}
                      <Text className={styles.pageText}>
                        {result.content}
                      </Text>
                    </div>
                  </Command.Item>
                ))}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog>
    </>
  );
}

function getResultIcon(result: SearchResult): React.ReactNode {
  if (result.type === "api") {
    const method = result.content.split(" ")[0];
    return ["GET", "POST", "PUT", "DELETE", "PATCH"].includes(method)
      ? <MethodBadge method={method} size="micro" />
      : null;
  }
  return <DocumentIcon className={styles.icon} />;
}
