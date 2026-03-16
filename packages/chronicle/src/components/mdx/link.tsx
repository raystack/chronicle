'use client'

import { Link } from 'react-router-dom'
import type { ComponentProps } from 'react'

type LinkProps = ComponentProps<'a'>

export function MdxLink({ href, children, ...props }: LinkProps) {
  if (!href) {
    return <span {...props}>{children}</span>
  }

  const isExternal = href.startsWith('http://') || href.startsWith('https://')
  const isAnchor = href.startsWith('#')

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  }

  if (isAnchor) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }

  return (
    <Link to={href} className={props.className}>
      {children}
    </Link>
  )
}
