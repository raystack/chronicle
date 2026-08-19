import type { MDXComponents } from 'mdx/types'
import { MDXImage } from './image'
import { Link } from './link'
import { MdxTable, MdxThead, MdxTbody, MdxTr, MdxTh, MdxTd } from './table'
import { MdxPre, MdxCode } from './code'
import { MdxDetails, MdxSummary } from './details'
import { MdxParagraph } from './paragraph'
import { CalloutContainer, CalloutTitle, CalloutDescription, MdxBlockquote } from '@/components/common/callout'
import { Avatar, AvatarGroup, Badge, Tabs } from '@raystack/apsara'
import { type ComponentProps, lazy, useEffect, useState, Suspense } from 'react'

const LazyMermaid = lazy(() => import('./mermaid').then(m => ({ default: m.Mermaid })))

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <>{children}</> : null
}

function MdxTabs(props: ComponentProps<typeof Tabs>) {
  return <ClientOnly><Tabs {...props} /></ClientOnly>
}
MdxTabs.List = Tabs.List
MdxTabs.Tab = Tabs.Tab
MdxTabs.Content = Tabs.Content

// Capitalized keys must stay in sync with MDX_COMPONENT_NAMES in
// src/lib/mdx-component-names.ts (used for compile-time validation).
export const mdxComponents: MDXComponents = {
  p: MdxParagraph,
  img: MDXImage,
  a: Link,
  table: MdxTable,
  thead: MdxThead,
  tbody: MdxTbody,
  tr: MdxTr,
  th: MdxTh,
  td: MdxTd,
  code: MdxCode,
  pre: MdxPre,
  details: MdxDetails,
  summary: MdxSummary,
  blockquote: MdxBlockquote,
  Callout: CalloutContainer,
  CalloutTitle,
  CalloutDescription,
  Tabs: MdxTabs,
  Badge,
  Avatar,
  AvatarGroup,
  Mermaid: (props: { chart: string }) => (
    <Suspense fallback={<pre><code>{props.chart}</code></pre>}>
      <LazyMermaid {...props} />
    </Suspense>
  ),
}

export { MDXImage } from './image'
export { Link } from './link'
