import type { MDXComponents } from 'mdx/types'
import { Image } from './image'
import { Link } from './link'
import { MdxTable, MdxThead, MdxTbody, MdxTr, MdxTh, MdxTd } from './table'
import { MdxPre, MdxCode } from './code'
import { MdxDetails, MdxSummary } from './details'
import { Mermaid } from './mermaid'
import { MdxParagraph } from './paragraph'
import { CalloutContainer, CalloutTitle, CalloutDescription, MdxBlockquote } from '@/components/common/callout'
import { Tabs } from '@raystack/apsara'
import { type ComponentProps, useEffect, useState } from 'react'

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

export const mdxComponents: MDXComponents = {
  p: MdxParagraph,
  img: Image,
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
  Mermaid,
}

export { Image } from './image'
export { Link } from './link'
