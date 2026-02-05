"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Command, Dialog, Text } from "@raystack/apsara";
import { useDocsSearch } from "fumadocs-core/search/client";
import type { SortedResult } from "fumadocs-core/search";
import { DocumentIcon, HashtagIcon } from "@heroicons/react/24/outline";
import styles from "./search.module.css";

export function Search() {
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

  const results = query.data === "empty" ? [] : (query.data ?? []);

  return (
    <>
      <Button variant="outline" color="neutral" onClick={() => setOpen(true)} className={styles.trigger} trailingIcon={<kbd className={styles.kbd}>⌘ K</kbd>}>
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
              {!query.isLoading && search.length > 0 && results.length === 0 && (
                <Command.Empty>No results found.</Command.Empty>
              )}
              {!query.isLoading && search.length === 0 && results.length > 0 && (
                <Command.Group heading="Suggestions">
                  {results.slice(0, 8).map((result: SortedResult) => (
                    <Command.Item
                      key={result.id}
                      value={result.id}
                      onSelect={() => onSelect(result.url)}
                      className={styles.item}
                    >
                      <div className={styles.itemContent}>
                        <DocumentIcon className={styles.icon} />
                        <Text className={styles.pageText}>{result.content}</Text>
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
                      {result.type === "page" ? <DocumentIcon className={styles.icon} /> : <HashtagIcon className={styles.icon} />}
                      <div className={styles.resultText}>
                        {result.type === "heading" ? (
                          <>
                            <Text className={styles.headingText}>{result.content}</Text>
                            <Text className={styles.separator}>-</Text>
                            <Text className={styles.pageText}>{getPageTitle(result.url)}</Text>
                          </>
                        ) : (
                          <Text className={styles.pageText}>{result.content}</Text>
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

function getPageTitle(url: string): string {
  const path = url.split("#")[0];
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "";
  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

