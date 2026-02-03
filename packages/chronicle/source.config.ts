import { defineDocs } from 'fumadocs-mdx/config'

const contentDir = process.env.CHRONICLE_CONTENT_DIR || './content'

export const docs = defineDocs({
  dir: contentDir,
  docs: {
    files: ['**/*.mdx', '!**/node_modules/**'],
  },
})
