import { htmlTagNames } from 'html-tag-names'
import { svgTagNames } from 'svg-tag-names'

// Names of custom components available to MDX content.
// Keep in sync with the capitalized keys of `mdxComponents` in src/components/mdx/index.tsx.
// This lives in a React-free module so the CLI/vite-config can import it.
export const MDX_COMPONENT_NAMES = [
  'Callout',
  'CalloutTitle',
  'CalloutDescription',
  'Tabs',
  'Mermaid',
  'Badge',
  'Avatar',
  'AvatarGroup',
] as const

export const KNOWN_TAGS = new Set<string>([...htmlTagNames, ...svgTagNames])
