'use client'

import NextLink from 'next/link'
import { Link as ApsaraLink } from '@raystack/apsara'
import type { ComponentProps } from 'react'

type LinkProps = ComponentProps<'a'>

export function Link({ href, children, ...props }: LinkProps) {
  if (!href) {
    return <span {...props}>{children}</span>
  }

  const isExternal = href.startsWith('http://') || href.startsWith('https://')
  const isAnchor = href.startsWith('#')

  if (isAnchor) {
    return (
      <ApsaraLink href={href} {...props}>
        {children}
      </ApsaraLink>
    )
  }

  if (isExternal) {
    return (
      <ApsaraLink href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </ApsaraLink>
    )
  }

  return (
    <NextLink href={href} className={props.className}>
      {children}
    </NextLink>
  )
}
