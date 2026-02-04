'use client'

import { ThemeSwitcher } from '@raystack/apsara'
import { useState, useEffect } from 'react'

interface ClientThemeSwitcherProps {
  size?: number
}

export function ClientThemeSwitcher({ size }: ClientThemeSwitcherProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient ? <ThemeSwitcher size={size} /> : null
}
