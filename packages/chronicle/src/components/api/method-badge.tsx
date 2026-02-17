'use client'

import { Text } from '@raystack/apsara'
import styles from './method-badge.module.css'

const methodColors: Record<string, string> = {
  GET: styles.get,
  POST: styles.post,
  PUT: styles.put,
  DELETE: styles.delete,
  PATCH: styles.patch,
}

interface MethodBadgeProps {
  method: string
}

export function MethodBadge({ method }: MethodBadgeProps) {
  const colorClass = methodColors[method.toUpperCase()] ?? ''

  return (
    <Text size={1} weight="bold" className={`${styles.badge} ${colorClass}`}>
      {method.toUpperCase()}
    </Text>
  )
}
