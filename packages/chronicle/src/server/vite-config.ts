import react from '@vitejs/plugin-react';
import { remarkDirectiveAdmonition, remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { defineConfig as defineFumadocsConfig } from 'fumadocs-mdx/config';
import mdx from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import remarkDirective from 'remark-directive';
import { type InlineConfig } from 'vite';
import remarkResolveImages from '../lib/remark-resolve-images';
import remarkResolveLinks from '../lib/remark-resolve-links';
import remarkReadingTime from 'remark-reading-time';
import remarkUnusedDirectives from '../lib/remark-unused-directives';

function getDatabaseConnector(preset?: string): { connector: string; options?: Record<string, unknown> } {
  switch (preset) {
    case 'bun':
      return { connector: 'bun-sqlite', options: { name: 'chronicle-search' } };
    case 'cloudflare':
    case 'cloudflare-pages':
    case 'cloudflare-module':
      return { connector: 'cloudflare-d1', options: { bindingName: 'CHRONICLE_DB' } };
    default:
      return { connector: 'sqlite', options: { name: 'chronicle-search' } };
  }
}

function resolveOutputDir(projectRoot: string, preset?: string): string {
  if (preset === 'vercel' || preset === 'vercel-static') return path.resolve(projectRoot, '.vercel/output');
  return path.resolve(projectRoot, '.output');
}

export interface ViteConfigOptions {
  packageRoot: string;
  projectRoot: string;
  configPath?: string;
  preset?: string;
}

async function readChronicleConfig(projectRoot: string, configPath?: string): Promise<string | null> {
  if (configPath) {
    try {
      return await fs.readFile(configPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read config file '${configPath}': ${(error as Error).message}`);
    }
  }
  try {
    return await fs.readFile(path.join(projectRoot, 'chronicle.yaml'), 'utf-8');
  } catch {
    return null;
  }
}

export async function createViteConfig(
  options: ViteConfigOptions
): Promise<InlineConfig> {
  const { packageRoot, projectRoot, configPath, preset } = options;
  const rawConfig = await readChronicleConfig(projectRoot, configPath);
  const contentMirror = path.resolve(packageRoot, '.content');

  return {
    root: packageRoot,
    publicDir: path.resolve(projectRoot, 'public'),
    configFile: false,
    plugins: [
      nitro({
        serverDir: path.resolve(packageRoot, 'src/server'),
        ...(preset && { preset }),
      }),
      mdx({
        default: defineFumadocsConfig({
          mdxOptions: {
            remarkImageOptions: false,
            valueToExport: ['readingTime'],
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
              remarkResolveLinks,
              remarkResolveImages,
              remarkMdxMermaid,
              remarkReadingTime,
            ],
          },
        }),
      }, { index: false }),
      react()
    ],
    resolve: {
      alias: {
        '@': path.resolve(packageRoot, 'src'),
        'tslib': 'tslib/tslib.es6.js',
      },
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
        allow: [packageRoot, projectRoot, contentMirror]
      }
    },
    define: {
      __CHRONICLE_CONTENT_DIR__: JSON.stringify(contentMirror),
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
      logLevel: 2,
      publicAssets: [{ dir: path.resolve(projectRoot, 'public') }],
      output: {
        dir: resolveOutputDir(projectRoot, preset),
      },
      experimental: {
        database: true,
      },
      database: {
        default: getDatabaseConnector(preset),
      },
    },
  };
}
