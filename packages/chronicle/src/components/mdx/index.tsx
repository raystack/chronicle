import type { MDXComponents } from 'mdx/types'
import { Image } from './image'
import { Link } from './link'
import { Callout } from '../common/callout'
import { CodeBlock } from '../common/code-block'
import { Tabs } from '../common/tabs'
import { Table } from '../common/table'

export const mdxComponents: MDXComponents = {
  img: Image,
  a: Link,
  Callout,
  CodeBlock,
  Tabs,
  Table,
}

export { Image } from './image'
export { Link } from './link'
