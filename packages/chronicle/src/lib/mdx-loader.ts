import React, { type ReactNode } from 'react';
import type { TableOfContents } from 'fumadocs-core/toc';
import { mdxComponents } from '@/components/mdx';

const contentModules = import.meta.glob<{ default?: React.ComponentType<any>; toc?: TableOfContents }>(
  '../../.content/**/*.{mdx,md}'
);

export async function loadMdxModule(relativePath: string): Promise<{ content: ReactNode; toc: TableOfContents }> {
  const withoutExt = relativePath.replace(/\.(mdx|md)$/, '');
  const key = relativePath.endsWith('.md')
    ? `../../.content/${withoutExt}.md`
    : `../../.content/${withoutExt}.mdx`;
  const loader = contentModules[key];
  if (!loader) return { content: null, toc: [] };
  const mod = await loader();
  const content = mod.default
    ? React.createElement(mod.default, { components: mdxComponents })
    : null;
  return { content, toc: mod.toc ?? [] };
}
