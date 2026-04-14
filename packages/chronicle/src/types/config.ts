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
})

export const chronicleConfigSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
  content: z.string().optional(),
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

export type ChronicleConfig = z.infer<typeof chronicleConfigSchema>
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
