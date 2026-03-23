import react from '@vitejs/plugin-react';
import mdx from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import path from 'node:path';
import { type InlineConfig } from 'vite';

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
        alias: {
          '@content': path.resolve(packageRoot, '.content'),
        },
      }),
      mdx({}, { index: false }),
      react(),
      {
        name: 'chronicle:content-alias',
        resolveId(id) {
          if (id.startsWith('@content/')) {
            return path.resolve(packageRoot, '.content', id.slice('@content/'.length));
          }
        },
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(packageRoot, 'src'),
        '@content': path.resolve(packageRoot, '.content'),
      },
      conditions: ['module-sync', 'import', 'node'],
      preserveSymlinks: true,
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
