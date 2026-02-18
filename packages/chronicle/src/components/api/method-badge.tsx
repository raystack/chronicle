'use client'

import { Badge } from '@raystack/apsara'
import styles from './method-badge.module.css'

type BadgeVariant = 'accent' | 'danger' | 'success' | 'neutral' | 'warning' | 'gradient'

const methodVariants: Record<string, BadgeVariant> = {
  GET: 'accent',
  POST: 'success',
  PUT: 'warning',
  DELETE: 'danger',
  PATCH: 'neutral',
}

interface MethodBadgeProps {
  method: string
  size?: 'micro' | 'small' | 'regular'
}

export function MethodBadge({ method, size = 'small' }: MethodBadgeProps) {
  const variant = methodVariants[method.toUpperCase()] ?? 'neutral'

  return (
    <Badge variant={variant} size={size} className={styles.badge}>
      {method.toUpperCase()}
    </Badge>
  )
}
