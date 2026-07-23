// Vite build-time constants (injected via define in vite-config.ts)
declare const __CHRONICLE_CONTENT_DIR__: string
declare const __CHRONICLE_PROJECT_ROOT__: string
declare const __CHRONICLE_PACKAGE_ROOT__: string
declare const __CHRONICLE_CONFIG_RAW__: string | null

// Nitro sets import.meta.dev to true in the dev server, false in builds
interface ImportMeta {
  readonly dev?: boolean
}
