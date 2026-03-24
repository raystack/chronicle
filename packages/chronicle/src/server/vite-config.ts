import react from '@vitejs/plugin-react';
import { remarkDirectiveAdmonition, remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { defineConfig as defineFumadocsConfig } from 'fumadocs-mdx/config';
import mdx from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import remarkDirective from 'remark-directive';
import { type InlineConfig } from 'vite';
import remarkUnusedDirectives from '../lib/remark-unused-directives';

function resolveOutputDir(projectRoot: string, preset?: string): string {
  if (preset === 'vercel' || preset === 'vercel-static') return path.resolve(projectRoot, '.vercel/output');
  return path.resolve(projectRoot, '.output');
}

export interface ViteConfigOptions {
  packageRoot: string;
  projectRoot: string;
  contentDir: string;
  preset?: string;
}

async function readChronicleConfig(projectRoot: string, contentDir: string): Promise<string | null> {
  for (const dir of [projectRoot, contentDir]) {
    const filePath = path.join(dir, 'chronicle.yaml');
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      // not found, try next
    }
  }
  return null;
}

export async function createViteConfig(
  options: ViteConfigOptions
): Promise<InlineConfig> {
  const { packageRoot, projectRoot, contentDir, preset } = options;
  const rawConfig = await readChronicleConfig(projectRoot, contentDir);

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
      __CHRONICLE_CONFIG_RAW__: JSON.stringify(rawConfig),
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
    },
    nitro: {
      output: {
        dir: resolveOutputDir(projectRoot, preset),
      },
    },
  };
}
