'use client'

import { QuestionMarkCircledIcon } from '@radix-ui/react-icons'
import { IconButton, Menu, Sidebar } from '@raystack/apsara'
import { useNavigate } from 'react-router'
import { usePageContext } from '@/lib/page-context'
import styles from './sidebar-links.module.css'

const isExternal = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href)

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

  // Tag the destination with the page the user clicked from. Schemes other than
  // http(s) — mailto:, slack: — carry an opaque path, so they're left alone.
  const open = (href: string) => {
    const url = new URL(href, window.location.origin)
    const isWeb = url.protocol === 'http:' || url.protocol === 'https:'
    if (isWeb) url.searchParams.set('ref', window.location.href)

    if (isExternal(href)) {
      // `noopener` only — the destination should see Chronicle as the referrer.
      window.open(isWeb ? url.toString() : href, '_blank', 'noopener')
    } else {
      navigate(`${url.pathname}${url.search}${url.hash}`)
    }
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
        <QuestionMarkCircledIcon width={16} height={16} />
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
