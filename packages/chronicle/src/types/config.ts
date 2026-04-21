import uniqBy from 'lodash/uniqBy'
import { z } from 'zod'

const logoSchema = z.object({
  light: z.string().optional(),
  dark: z.string().optional(),
})

const themeSchema = z.object({
  name: z.enum(['default', 'paper']),
  colors: z.record(z.string(), z.string()).optional(),
})

const navLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
})

const socialLinkSchema = z.object({
  type: z.string(),
  href: z.string(),
})

const navigationSchema = z.object({
  links: z.array(navLinkSchema).optional(),
  social: z.array(socialLinkSchema).optional(),
})

const searchSchema = z.object({
  enabled: z.boolean().optional(),
  placeholder: z.string().optional(),
})

const apiServerSchema = z.object({
  url: z.string(),
  description: z.string().optional(),
})

const apiAuthSchema = z.object({
  type: z.string(),
  header: z.string(),
  placeholder: z.string().optional(),
})

const apiSchema = z.object({
  name: z.string(),
  spec: z.string(),
  basePath: z.string(),
  server: apiServerSchema,
  auth: apiAuthSchema.optional(),
})

const footerSchema = z.object({
  copyright: z.string().optional(),
  links: z.array(navLinkSchema).optional(),
})

const llmsSchema = z.object({
  enabled: z.boolean().optional(),
})

const googleAnalyticsSchema = z.object({
  measurementId: z.string(),
})

const analyticsSchema = z.object({
  enabled: z.boolean().optional(),
  googleAnalytics: googleAnalyticsSchema.optional(),
})

const telemetrySchema = z.object({
  enabled: z.boolean().optional(),
  serviceName: z.string().optional(),
  port: z.number().int().min(1).max(65535).default(9090),
})

const siteSchema = z.object({
  title: z.string(),
})

const contentEntrySchema = z.object({
  dir: z.string().min(1),
  label: z.string().min(1),
})

// Variants map to Apsara Badge color prop.
// https://apsara.raystack.org/docs/components/badge
const badgeVariantSchema = z.enum([
  'accent',
  'warning',
  'danger',
  'success',
  'neutral',
  'gradient',
])

const badgeSchema = z.object({
  label: z.string().min(1),
  variant: badgeVariantSchema.default('accent'),
})

const latestSchema = z.object({
  label: z.string().min(1),
})

const versionSchema = z.object({
  dir: z.string().min(1),
  label: z.string().min(1),
  badge: badgeSchema.optional(),
  content: z.array(contentEntrySchema).min(1),
  api: z.array(apiSchema).optional(),
})

const allUnique = <T>(items: T[], key: (item: T) => string): boolean =>
  uniqBy(items, key).length === items.length

export const chronicleConfigSchema = z
  .object({
    site: siteSchema,
    description: z.string().optional(),
    url: z.string().optional(),
    content: z.array(contentEntrySchema).min(1),
    latest: latestSchema.optional(),
    versions: z.array(versionSchema).optional(),
    preset: z.string().optional(),
    logo: logoSchema.optional(),
    theme: themeSchema.optional(),
    navigation: navigationSchema.optional(),
    search: searchSchema.optional(),
    footer: footerSchema.optional(),
    api: z.array(apiSchema).optional(),
    llms: llmsSchema.optional(),
    analytics: analyticsSchema.optional(),
    telemetry: telemetrySchema.optional(),
  })
  .strict()
  .refine((cfg) => allUnique(cfg.content, (c) => c.dir), {
    message: 'content[].dir must be unique',
    path: ['content'],
  })
  .refine((cfg) => !cfg.versions || allUnique(cfg.versions, (v) => v.dir), {
    message: 'versions[].dir must be unique',
    path: ['versions'],
  })
  .refine(
    (cfg) =>
      !cfg.versions ||
      cfg.versions.every((v) => allUnique(v.content, (c) => c.dir)),
    {
      message: 'versions[].content[].dir must be unique within each version',
      path: ['versions'],
    },
  )
  .refine((cfg) => !cfg.versions || cfg.versions.length === 0 || !!cfg.latest, {
    message: 'latest is required when versions are declared',
    path: ['latest'],
  })

export type ChronicleConfig = z.infer<typeof chronicleConfigSchema>
export type SiteConfig = z.infer<typeof siteSchema>
export type ContentEntry = z.infer<typeof contentEntrySchema>
export type BadgeConfig = z.infer<typeof badgeSchema>
export type BadgeVariant = z.infer<typeof badgeVariantSchema>
export type LatestConfig = z.infer<typeof latestSchema>
export type VersionConfig = z.infer<typeof versionSchema>
export type LogoConfig = z.infer<typeof logoSchema>
export type ThemeConfig = z.infer<typeof themeSchema>
export type NavigationConfig = z.infer<typeof navigationSchema>
export type NavLink = z.infer<typeof navLinkSchema>
export type SocialLink = z.infer<typeof socialLinkSchema>
export type SearchConfig = z.infer<typeof searchSchema>
export type ApiConfig = z.infer<typeof apiSchema>
export type ApiServerConfig = z.infer<typeof apiServerSchema>
export type ApiAuthConfig = z.infer<typeof apiAuthSchema>
export type FooterConfig = z.infer<typeof footerSchema>
export type LlmsConfig = z.infer<typeof llmsSchema>
export type AnalyticsConfig = z.infer<typeof analyticsSchema>
export type GoogleAnalyticsConfig = z.infer<typeof googleAnalyticsSchema>
export type TelemetryConfig = z.infer<typeof telemetrySchema>
