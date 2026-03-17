import path from 'path'
import { type InlineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import rehypeShiki from '@shikijs/rehype'

export interface ViteConfigOptions {
  root: string
  contentDir: string
  isDev?: boolean
}

export async function createViteConfig(options: ViteConfigOptions): Promise<InlineConfig> {
  const { root, contentDir, isDev = false } = options

  return {
    root,
    configFile: false,
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'),
        '@content': contentDir,
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    server: {
      fs: {
        allow: [root, contentDir],
      },
    },
    plugins: [
      mdx({
        remarkPlugins: [
          remarkFrontmatter,
          remarkMdxFrontmatter,
          remarkGfm,
          remarkDirective,
        ],
        rehypePlugins: [
          [rehypeShiki, { themes: { light: 'github-light', dark: 'github-dark' } }],
        ],
        mdExtensions: ['.md'],
        mdxExtensions: ['.mdx'],
      }),
      react(),
    ],
    define: {
      'process.env.CHRONICLE_CONTENT_DIR': JSON.stringify(contentDir),
      'process.env.CHRONICLE_PROJECT_ROOT': JSON.stringify(root),
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
    },
    ssr: {
      noExternal: ['@raystack/apsara'],
    },
    build: {
      rolldownOptions: {
        input: isDev ? undefined : {
          client: path.resolve(root, 'src/server/index.html'),
        },
      },
    },
  }
}
