import type { ComponentProps } from 'react'

export function MdxDetails({ children, className, ...props }: ComponentProps<'details'>) {
  return (
    <details className={className} {...props}>
      {children}
    </details>
  )
}

export function MdxSummary({ children, className, ...props }: ComponentProps<'summary'>) {
  return (
    <summary className={className} {...props}>
      {children}
    </summary>
  )
}
