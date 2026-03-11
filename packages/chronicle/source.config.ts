import { defineDocs, defineConfig } from 'fumadocs-mdx/config'
import remarkDirective from 'remark-directive'
import { remarkDirectiveAdmonition } from 'fumadocs-core/mdx-plugins'
import remarkUnusedDirectives from './src/lib/remark-unused-directives'

const contentDir = process.env.CHRONICLE_CONTENT_DIR || './content'

export const docs = defineDocs({
  dir: contentDir,
  docs: {
    files: ['**/*.mdx', '**/*.md', '!**/node_modules/**'],
  },
})

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      remarkDirective,
      [
        remarkDirectiveAdmonition,
        {
          tags: {
            CalloutContainer: 'Callout',
            CalloutTitle: 'CalloutTitle',
            CalloutDescription: 'CalloutDescription',
          },
          types: {
            note: 'accent',
            tip: 'accent',
            info: 'accent',
            warn: 'attention',
            warning: 'attention',
            danger: 'alert',
            caution: 'alert',
            success: 'success',
          },
        },
      ],
      remarkUnusedDirectives,
    ],
  },
})
