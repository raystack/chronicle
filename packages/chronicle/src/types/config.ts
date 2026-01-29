export interface ChronicleConfig {
  title: string
  description?: string
  logo?: LogoConfig
  theme?: ThemeConfig
  navigation?: NavigationConfig
  search?: SearchConfig
  footer?: FooterConfig
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
