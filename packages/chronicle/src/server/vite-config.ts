import react from '@vitejs/plugin-react';
import { rehypeCodeDefaultOptions, rehypeToc, remarkDirectiveAdmonition, remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { defineConfig as defineFumadocsConfig } from 'fumadocs-mdx/config';
import mdx from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import remarkDirective from 'remark-directive';
import { type InlineConfig, type Plugin } from 'vite';
import remarkResolveImages from '../lib/remark-resolve-images';
import remarkResolveLinks from '../lib/remark-resolve-links';
import remarkReadingTime from 'remark-reading-time';
import remarkUnusedDirectives from '../lib/remark-unused-directives';
import type { Pluggable } from 'unified';
import remarkValidateMdx from '../lib/remark-validate-mdx';
import rehypeTocText from '../lib/rehype-toc-text';

// Literal names rather than `string`: Nitro types the connector as db0's
// `ConnectorName` union, and each of these is a member of it.
type DatabaseConnector = 'bun-sqlite' | 'cloudflare-d1' | 'sqlite';

function getDatabaseConnector(preset?: string): { connector: DatabaseConnector; options?: Record<string, unknown> } {
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
  const queue = seeds.map(name => ({ name, from: import.meta.url }));

  while (queue.length > 0) {
    const { name, from } = queue.pop()!;

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
    // dedupe by resolved dir, not name — isolated layouts (pnpm) can host
    // multiple versions of the same package in different directories
    if (!dir || dirs.has(dir)) continue;
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

/**
 * Content is mirrored into .content via directory symlinks. The client
 * environment keys modules by the mirror path (the glob import id), but the
 * watcher reports edits under the real path — so without remapping, changes
 * never invalidate client modules and the browser is not reloaded.
 */
function contentMirrorHmr(contentMirror: string): Plugin {
  let links: Array<[real: string, mirror: string]> = [];

  return {
    name: 'chronicle:content-mirror-hmr',
    async configureServer(server) {
      links = await collectMirrorLinks(contentMirror);
      // Re-emit add/unlink events at the mirror path so Vite re-evaluates
      // the .content/** glob importers (new/deleted pages) in every environment
      const remap = (event: 'add' | 'unlink') => (file: string) => {
        if (file.startsWith(contentMirror + path.sep)) return;
        for (const [real, mirror] of links) {
          if (!file.startsWith(real + path.sep)) continue;
          server.watcher.emit(event, path.join(mirror, file.slice(real.length + 1)));
          return;
        }
      };
      server.watcher.on('add', remap('add'));
      server.watcher.on('unlink', remap('unlink'));
    },
    hotUpdate({ file }) {
      if (this.environment.name !== 'client') return;
      for (const [real, mirror] of links) {
        if (!file.startsWith(real + path.sep)) continue;
        const mirrored = path.join(mirror, file.slice(real.length + 1));
        const modules = this.environment.moduleGraph.getModulesByFile(mirrored);
        if (modules?.size) return [...modules];
      }
    },
  };
}

async function collectMirrorLinks(dir: string): Promise<Array<[string, string]>> {
  const links: Array<[string, string]> = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return links;
  }
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if ((await fs.lstat(entryPath)).isSymbolicLink()) {
      links.push([await fs.realpath(entryPath), entryPath]);
    } else if (entry.isDirectory()) {
      links.push(...(await collectMirrorLinks(entryPath)));
    }
  }
  return links;
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

/**
 * fumadocs' `rehypeToc`, in either bare or `[plugin, options]` form. Matched by
 * name as well as identity: the CLI and fumadocs-mdx can resolve
 * `fumadocs-core/mdx-plugins` to separate module instances, in which case the
 * imported function is not the same object as the one in the plugin list.
 */
function isRehypeToc(plugin: Pluggable): boolean {
  const fn = Array.isArray(plugin) ? plugin[0] : plugin;
  return fn === rehypeToc || (typeof fn === 'function' && fn.name === 'rehypeToc');
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
            // Render fences in languages Shiki doesn't bundle (e.g. logql) as
            // plain text instead of throwing. Defaults are spread because the
            // config type isn't Partial — the factory merges them anyway.
            rehypeCodeOptions: {
              ...rehypeCodeDefaultOptions,
              fallbackLanguage: 'text',
            },
            // Swap fumadocs' rehypeToc for a text-only toc: it exports heading
            // content as JSX evaluated at module scope, so any component in a
            // heading fails to compile. Function form is required — an array
            // would be inserted before rehypeToc rather than replacing it.
            rehypePlugins: (plugins: Pluggable[]) => [
              ...plugins.filter(plugin => !isRehypeToc(plugin)),
              rehypeTocText,
            ],
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
      react(),
      contentMirrorHmr(contentMirror)
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
          // Single stylesheet: per-chunk CSS splitting emitted Apsara's CSS
          // into a shared chunk that linked after theme CSS and overrode it
          // (equal specificity, later order wins). One file makes the cascade
          // follow module import order — Apsara base first, themes after —
          // and guarantees lazy page chunks never render unstyled without JS.
          cssCodeSplit: false,
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
      publicAssets: [{ dir: path.resolve(projectRoot, 'public'), maxAge: 0 }],
      output: {
        dir: resolveOutputDir(projectRoot, preset),
      },
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
