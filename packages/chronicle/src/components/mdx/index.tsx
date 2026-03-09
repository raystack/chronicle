import type { MDXComponents } from 'mdx/types'
import { Image } from './image'
import { Link } from './link'
import { MdxTable, MdxThead, MdxTbody, MdxTr, MdxTh, MdxTd } from './table'
import { MdxPre } from './code'
import { CalloutContainer, CalloutTitle, CalloutDescription, MdxBlockquote } from '@/components/common/callout'
import { Tabs } from '@raystack/apsara'

export const mdxComponents: MDXComponents = {
  img: Image,
  a: Link,
  table: MdxTable,
  thead: MdxThead,
  tbody: MdxTbody,
  tr: MdxTr,
  th: MdxTh,
  td: MdxTd,
  pre: MdxPre,
  blockquote: MdxBlockquote,
  Callout: CalloutContainer,
  CalloutTitle,
  CalloutDescription,
  Tabs,
}

export { Image } from './image'
export { Link } from './link'
