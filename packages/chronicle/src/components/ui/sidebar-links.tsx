'use client'

import { HelpIcon } from '@/components/ui/icons';
import { IconButton, Menu, Sidebar } from '@raystack/apsara'
import { useNavigate } from 'react-router'
import { usePageContext } from '@/lib/page-context'
import styles from './sidebar-links.module.css'

const isExternal = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href)

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

interface SidebarLinksProps {
  /**
   * `menu` — a `?` icon button opening a dropdown, for the desktop sidebar footer.
   * `list` — the links inline as nav items, for the mobile hamburger menu.
   */
  variant?: 'menu' | 'list'
}

export function SidebarLinks({ variant = 'menu' }: SidebarLinksProps) {
  const { config } = usePageContext()
  const navigate = useNavigate()
  const links = config.links ?? []

  if (!links.length) return null

  // Tag outbound links so the destination can attribute the visit. Relative
  // paths are left untouched — they're same-origin, and tagging them would read
  // as a self-referral. Schemes other than http(s) — mailto:, slack: — carry an
  // opaque path, so they're left alone too.
  const open = (href: string) => {
    const url = new URL(href, window.location.origin)
    const isWeb = url.protocol === 'http:' || url.protocol === 'https:'

    if (!isExternal(href)) {
      navigate(`${url.pathname}${url.search}${url.hash}`)
      return
    }

    if (isWeb) {
      const params = {
        utm_source: window.location.hostname,
        utm_medium: slugify(config.site.title),
        utm_content: window.location.pathname,
      }
      // Anything already set on `href` wins.
      for (const [key, value] of Object.entries(params)) {
        if (value && !url.searchParams.has(key)) {
          url.searchParams.set(key, value)
        }
      }
    }

    // `noopener` only — the destination should see Chronicle as the referrer.
    window.open(isWeb ? url.toString() : href, '_blank', 'noopener')
  }

  if (variant === 'list') {
    return (
      <div className={styles.list}>
        {links.map(link => (
          <Sidebar.Item
            key={`${link.label}-${link.href}`}
            href={link.href}
            onClick={e => {
              e.preventDefault()
              open(link.href)
            }}
          >
            {link.label}
          </Sidebar.Item>
        ))}
      </div>
    )
  }

  return (
    <Menu>
      <Menu.Trigger
        render={
          <IconButton size={3} aria-label='Links' className={styles.trigger} />
        }
      >
        <HelpIcon width={16} height={16} />
      </Menu.Trigger>
      <Menu.Content side='top' align='end'>
        {links.map(link => (
          <Menu.Item
            key={`${link.label}-${link.href}`}
            onClick={() => open(link.href)}
          >
            {link.label}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  )
}
