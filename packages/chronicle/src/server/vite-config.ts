import react from '@vitejs/plugin-react';
import { remarkDirectiveAdmonition, remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { defineConfig as defineFumadocsConfig } from 'fumadocs-mdx/config';
import mdx from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import remarkDirective from 'remark-directive';
import { type InlineConfig } from 'vite';
import remarkResolveImages from '../lib/remark-resolve-images';
import remarkResolveLinks from '../lib/remark-resolve-links';
import remarkReadingTime from 'remark-reading-time';
import remarkUnusedDirectives from '../lib/remark-unused-directives';
import remarkValidateMdx from '../lib/remark-validate-mdx';

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

const STATIC_PRESETS = new Set(['static', 'vercel-static', 'cloudflare-pages', 'github-pages']);

const SSR_NO_EXTERNAL = ['@raystack/apsara', 'dayjs', 'fumadocs-core'];

export function isStaticPreset(preset?: string): boolean {
  return !!preset && STATIC_PRESETS.has(preset);
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

/**
 * Vite 8.1 enforces server.fs.allow on SSR module-runner imports. Nitro's dev
 * runtime and our ssr.noExternal packages are loaded by absolute path from
 * wherever the package manager hoisted them, which can be outside the allowed
 * roots. Resolve those packages plus their transitive runtime dependencies so
 * fs.allow stays scoped to exactly what the dev server needs.
 */
async function resolveRuntimeDepDirs(seeds: string[]): Promise<string[]> {
  const dirs = new Set<string>();
  const seen = new Set<string>();
  const queue = seeds.map(name => ({ name, from: import.meta.url }));

  while (queue.length > 0) {
    const { name, from } = queue.pop()!;
    if (seen.has(name)) continue;
    seen.add(name);

    const require = createRequire(from);
    let dir: string | null = null;
    try {
      dir = path.dirname(require.resolve(`${name}/package.json`));
    } catch {
      // package.json not in the exports map — locate the package root from
      // the resolved entry path instead
      try {
        const entry = require.resolve(name);
        const marker = path.join('node_modules', ...name.split('/')) + path.sep;
        const idx = entry.lastIndexOf(marker);
        if (idx !== -1) dir = entry.slice(0, idx + marker.length - 1);
      } catch {
        // optional or unresolvable dependency — skip
      }
    }
    if (!dir) continue;
    dirs.add(dir);

    try {
      const pkg = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf-8'));
      for (const dep of Object.keys(pkg.dependencies ?? {})) {
        queue.push({ name: dep, from: path.join(dir, 'package.json') });
      }
    } catch {
      // unreadable package.json — allow the dir itself and move on
    }
  }

  return [...dirs];
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
  const runtimeDepDirs = await resolveRuntimeDepDirs(['nitro', 'tslib', ...SSR_NO_EXTERNAL]);

  return {
    root: packageRoot,
    publicDir: path.resolve(projectRoot, 'public'),
    configFile: false,
    plugins: [
      nitro({
        serverDir: path.resolve(packageRoot, 'src/server'),
        ...(!isStaticPreset(preset) && preset && { preset }),
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
        ...(isStaticPreset(preset) && { prerender: { routes: [] } }),
      }),
      mdx({
        default: defineFumadocsConfig({
          mdxOptions: {
            remarkImageOptions: false,
            valueToExport: ['readingTime', 'images'],
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
              [remarkResolveImages, { optimize: !isStaticPreset(preset) }],
              remarkMdxMermaid,
              remarkReadingTime,
              remarkValidateMdx,
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
        allow: [packageRoot, projectRoot, contentMirror, ...runtimeDepDirs]
      }
    },
    define: {
      __CHRONICLE_CONTENT_DIR__: JSON.stringify(contentMirror),
      __CHRONICLE_PROJECT_ROOT__: JSON.stringify(projectRoot),
      __CHRONICLE_PACKAGE_ROOT__: JSON.stringify(packageRoot),
      __CHRONICLE_CONFIG_RAW__: JSON.stringify(rawConfig),
    },
    css: {
      modules: {
        localsConvention: 'camelCase'
      }
    },
    ssr: {
      noExternal: SSR_NO_EXTERNAL,
      external: ['analytics', 'use-analytics', '@analytics/google-analytics'],
    },
    environments: {
      client: {
        build: {
          manifest: isStaticPreset(preset),
          rollupOptions: {
            input: path.resolve(
              packageRoot,
              isStaticPreset(preset)
                ? 'src/server/entry-static.tsx'
                : 'src/server/entry-client.tsx',
            )
          }
        }
      }
    },
    nitro: {
      logLevel: 2,
      errorHandler: path.resolve(packageRoot, 'src/server/error.ts'),
      publicAssets: [{ dir: path.resolve(projectRoot, 'public') }],
      output: {
        dir: resolveOutputDir(projectRoot, preset),
      },
      externals: ['sharp'],
      storage: {
        'image-cache': {
          driver: 'fs',
          base: path.resolve(projectRoot, '.cache/images'),
        },
      },
      ...(isStaticPreset(preset)
        ? {}
        : {
            experimental: {
              database: true,
            },
            database: {
              default: getDatabaseConnector(preset),
            },
          }),
    },
  };
}
