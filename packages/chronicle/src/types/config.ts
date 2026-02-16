export interface ChronicleConfig {
  title: string
  description?: string
  logo?: LogoConfig
  theme?: ThemeConfig
  navigation?: NavigationConfig
  search?: SearchConfig
  footer?: FooterConfig
  api?: ApiConfig[]
}

export interface ApiConfig {
  name: string
  spec: string
  basePath: string
  server: ApiServerConfig
  auth?: ApiAuthConfig
}

export interface ApiServerConfig {
  url: string
  description?: string
}

export interface ApiAuthConfig {
  type: string
  header: string
  placeholder?: string
}

export interface LogoConfig {
  light?: string
  dark?: string
}

export interface ThemeConfig {
  name: 'default' | 'paper'
  colors?: Record<string, string>
}

export interface NavigationConfig {
  links?: NavLink[]
  social?: SocialLink[]
}

export interface NavLink {
  label: string
  href: string
}

export interface SocialLink {
  type: 'github' | 'twitter' | 'discord' | string
  href: string
}

export interface SearchConfig {
  enabled?: boolean
  placeholder?: string
}

export interface FooterConfig {
  copyright?: string
  links?: NavLink[]
}
