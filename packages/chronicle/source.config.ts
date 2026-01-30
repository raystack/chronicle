import { defineDocs } from 'fumadocs-mdx/config'

export const docs = defineDocs({
  dir: 'content',
  docs: {
    files: ['**/*.mdx', '!**/node_modules/**'],
  },
})
