import path from 'path'
import { type InlineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export interface ViteConfigOptions {
  root: string
  contentDir: string
  isDev?: boolean
}

export async function createViteConfig(options: ViteConfigOptions): Promise<InlineConfig> {
  const { root, contentDir, isDev = false } = options

  const mdx = (await import('fumadocs-mdx/vite')).default
  const mdxConfig = await import(path.resolve(root, 'source.config.ts'))

  return {
    root,
    configFile: false,
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'),
        '@/.source': path.resolve(root, '.source'),
      },
    },
    plugins: [
      react(),
      await mdx(mdxConfig, {
        configPath: path.resolve(root, 'source.config.ts'),
      }),
    ],
    define: {
      'process.env.CHRONICLE_CONTENT_DIR': JSON.stringify(contentDir),
      'process.env.CHRONICLE_PROJECT_ROOT': JSON.stringify(options.root),
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
    },
    ssr: {
      noExternal: isDev ? [] : undefined,
    },
    build: {
      rollupOptions: {
        input: isDev ? undefined : {
          client: path.resolve(root, 'src/server/index.html'),
        },
      },
    },
  }
}
