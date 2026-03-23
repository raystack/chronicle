import react from '@vitejs/plugin-react';
import { remarkDirectiveAdmonition, remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { defineConfig as defineFumadocsConfig } from 'fumadocs-mdx/config';
import mdx from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import path from 'node:path';
import remarkDirective from 'remark-directive';
import { type InlineConfig } from 'vite';
import remarkUnusedDirectives from '../lib/remark-unused-directives';

export interface ViteConfigOptions {
  packageRoot: string;
  projectRoot: string;
  contentDir: string;
  preset?: string;
}

export async function createViteConfig(
  options: ViteConfigOptions
): Promise<InlineConfig> {
  const { packageRoot, projectRoot, contentDir, preset } = options;

  return {
    root: packageRoot,
    configFile: false,
    plugins: [
      nitro({
        serverDir: path.resolve(packageRoot, 'src/server'),
        ...(preset && { preset }),
      }),
      mdx({
        default: defineFumadocsConfig({
          mdxOptions: {
            remarkPlugins: [
              remarkDirective,
              [remarkDirectiveAdmonition, {
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
              }],
              remarkUnusedDirectives,
              remarkMdxMermaid,
            ],
          },
        }),
      }, { index: false }),
      react()
    ],
    resolve: {
      alias: {
        '@': path.resolve(packageRoot, 'src'),
      },
      conditions: ['module-sync', 'import', 'node'],
      dedupe: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router',
      ]
    },
    server: {
      fs: {
        allow: [packageRoot, projectRoot, contentDir]
      }
    },
    define: {
      __CHRONICLE_CONTENT_DIR__: JSON.stringify(contentDir),
      __CHRONICLE_PROJECT_ROOT__: JSON.stringify(projectRoot),
      __CHRONICLE_PACKAGE_ROOT__: JSON.stringify(packageRoot)
    },
    css: {
      modules: {
        localsConvention: 'camelCase'
      }
    },
    ssr: {
      noExternal: ['@raystack/apsara', 'dayjs', 'fumadocs-core']
    },
    environments: {
      client: {
        build: {
          rollupOptions: {
            input: path.resolve(packageRoot, 'src/server/entry-client.tsx')
          }
        }
      }
    }
  };
}
