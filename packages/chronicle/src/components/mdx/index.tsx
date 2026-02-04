import type { MDXComponents } from 'mdx/types'
import { Image } from './image'
import { Link } from './link'
import { MdxTable, MdxThead, MdxTbody, MdxTr, MdxTh, MdxTd } from './table'
import { MdxPre } from './code'
import { Callout } from '../common/callout'

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
  Callout,
}

export { Image } from './image'
export { Link } from './link'
