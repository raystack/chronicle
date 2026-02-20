"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Command, Dialog, Text } from "@raystack/apsara";
import { cx } from "class-variance-authority";
import { useDocsSearch } from "fumadocs-core/search/client";
import type { SortedResult } from "fumadocs-core/search";
import { DocumentIcon, HashtagIcon } from "@heroicons/react/24/outline";
import { isMacOs } from "react-device-detect";
import { MethodBadge } from "@/components/api/method-badge";
import styles from "./search.module.css";

function SearchShortcutKey({ className }: { className?: string }) {
  const [key, setKey] = useState("⌘");

  useEffect(() => {
    setKey(isMacOs ? "⌘" : "Ctrl");
  }, []);

  return (
    <kbd className={className} suppressHydrationWarning>
      {key} K
    </kbd>
  );
}

interface SearchProps {
  className?: string
}

export function Search({ className }: SearchProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { search, setSearch, query } = useDocsSearch({
    type: "fetch",
    api: "/api/search",
    delayMs: 100,
    allowEmpty: true,
  });

  const onSelect = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router],
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

  const results = deduplicateByUrl(
    query.data === "empty" ? [] : (query.data ?? []),
  );

  return (
    <>
      <Button
        variant="outline"
        color="neutral"
        onClick={() => setOpen(true)}
        className={cx(styles.trigger, className)}
        trailingIcon={<SearchShortcutKey className={styles.kbd} />}
      >
        <Text>Search...</Text>
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
              {query.isLoading && <Command.Empty>Loading...</Command.Empty>}
              {!query.isLoading &&
                search.length > 0 &&
                results.length === 0 && (
                  <Command.Empty>No results found.</Command.Empty>
                )}
              {!query.isLoading &&
                search.length === 0 &&
                results.length > 0 && (
                  <Command.Group heading="Suggestions">
                    {results.slice(0, 8).map((result: SortedResult) => (
                      <Command.Item
                        key={result.id}
                        value={result.id}
                        onSelect={() => onSelect(result.url)}
                        className={styles.item}
                      >
                        <div className={styles.itemContent}>
                          {getResultIcon(result)}
                          <Text className={styles.pageText}>
                            {stripMethod(result.content)}
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
                    onSelect={() => onSelect(result.url)}
                    className={styles.item}
                  >
                    <div className={styles.itemContent}>
                      {getResultIcon(result)}
                      <div className={styles.resultText}>
                        {result.type === "heading" ? (
                          <>
                            <Text className={styles.headingText}>
                              {stripMethod(result.content)}
                            </Text>
                            <Text className={styles.separator}>-</Text>
                            <Text className={styles.pageText}>
                              {getPageTitle(result.url)}
                            </Text>
                          </>
                        ) : (
                          <Text className={styles.pageText}>
                            {stripMethod(result.content)}
                          </Text>
                        )}
                      </div>
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

function deduplicateByUrl(results: SortedResult[]): SortedResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const base = r.url.split("#")[0];
    if (seen.has(base)) return false;
    seen.add(base);
    return true;
  });
}

const API_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH"]);

function extractMethod(content: string): string | null {
  const first = content.split(" ")[0];
  return API_METHODS.has(first) ? first : null;
}

function stripMethod(content: string): string {
  const first = content.split(" ")[0];
  return API_METHODS.has(first) ? content.slice(first.length + 1) : content;
}

function getResultIcon(result: SortedResult): React.ReactNode {
  if (!result.url.startsWith("/apis/")) {
    return result.type === "page" ? (
      <DocumentIcon className={styles.icon} />
    ) : (
      <HashtagIcon className={styles.icon} />
    );
  }
  const method = extractMethod(result.content);
  return method ? <MethodBadge method={method} size="micro" /> : null;
}

function getPageTitle(url: string): string {
  const path = url.split("#")[0];
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) return "Home";
  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
