import react from '@vitejs/plugin-react';
import mdx from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import path from 'node:path';
import { type InlineConfig } from 'vite';

export interface ViteConfigOptions {
  root: string;
  contentDir: string;
  preset?: string;
}

export async function createViteConfig(
  options: ViteConfigOptions
): Promise<InlineConfig> {
  const { root, contentDir, preset } = options;

  return {
    root,
    configFile: false,
    plugins: [
      nitro({
        serverDir: path.resolve(root, 'src/server'),
        ...(preset && { preset })
      }),
      mdx({}, { index: false }),
      react()
    ],
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'),
        '@content': contentDir
      },
      dedupe: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime'
      ]
    },
    server: {
      fs: {
        allow: [root, contentDir]
      }
    },
    define: {
      __CHRONICLE_CONTENT_DIR__: JSON.stringify(contentDir),
      __CHRONICLE_PROJECT_ROOT__: JSON.stringify(path.resolve(contentDir, '..'))
    },
    css: {
      modules: {
        localsConvention: 'camelCase'
      }
    },
    ssr: {
      noExternal: ['@raystack/apsara', 'fumadocs-core']
    },
    environments: {
      client: {
        build: {
          rollupOptions: {
            input: path.resolve(root, 'src/server/entry-client.tsx')
          }
        }
      }
    }
  };
}
