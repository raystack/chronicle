"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "@raystack/apsara";
import {
  generateCurl,
  generatePython,
  generateGo,
  generateTypeScript,
} from "@/lib/snippet-generators";
import styles from "./code-snippets.module.css";

interface CodeSnippetsProps {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

const languages = [
  { value: "curl", label: "cURL", lang: "curl", generate: generateCurl },
  {
    value: "python",
    label: "Python",
    lang: "python",
    generate: generatePython,
  },
  { value: "go", label: "Go", lang: "go", generate: generateGo },
  {
    value: "typescript",
    label: "TypeScript",
    lang: "typescript",
    generate: generateTypeScript,
  },
];

export function CodeSnippets({
  method,
  url,
  headers,
  body,
}: CodeSnippetsProps) {
  const opts = { method, url, headers, body };
  const [selected, setSelected] = useState("curl");
  const current = languages.find((l) => l.value === selected) ?? languages[0];

  const code = useMemo(
    () => current.generate(opts),
    [selected, method, url, headers, body],
  );

  return (
    <CodeBlock
      value={selected}
      onValueChange={setSelected}
      className={styles.snippets}
    >
      <CodeBlock.Header>
        <CodeBlock.LanguageSelect>
          <CodeBlock.LanguageSelectTrigger />
          <CodeBlock.LanguageSelectContent>
            {languages.map((l) => (
              <CodeBlock.LanguageSelectItem key={l.value} value={l.value}>
                {l.label}
              </CodeBlock.LanguageSelectItem>
            ))}
          </CodeBlock.LanguageSelectContent>
        </CodeBlock.LanguageSelect>
        <CodeBlock.CopyButton />
      </CodeBlock.Header>
      <CodeBlock.Content>
        <CodeBlock.Code language={current.lang}>{code}</CodeBlock.Code>
      </CodeBlock.Content>
    </CodeBlock>
  );
}
