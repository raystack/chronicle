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
  Tabs,
  Mermaid,
}

export { Image } from './image'
export { Link } from './link'
