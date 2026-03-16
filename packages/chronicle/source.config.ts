import { defineDocs, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config'
import { z } from 'zod'
import remarkDirective from 'remark-directive'
import { remarkDirectiveAdmonition, remarkMdxMermaid } from 'fumadocs-core/mdx-plugins'
import remarkUnusedDirectives from './src/lib/remark-unused-directives'

const contentDir = process.env.CHRONICLE_CONTENT_DIR || './content'

export const docs = defineDocs({
  dir: contentDir,
  docs: {
    schema: frontmatterSchema.extend({
      order: z.number().optional(),
      lastModified: z.string().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
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
      remarkMdxMermaid,
    ],
  },
})
