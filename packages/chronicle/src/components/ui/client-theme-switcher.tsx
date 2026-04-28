'use client'

import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { IconButton, useTheme } from '@raystack/apsara'
import { useEffect, useState } from 'react'

interface ClientThemeSwitcherProps {
  size?: number
}

export function ClientThemeSwitcher({ size = 16 }: ClientThemeSwitcherProps) {
  const [isClient, setIsClient] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  const isDark = resolvedTheme === 'dark'
  return (
    <IconButton
      size={3}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <SunIcon width={size} height={size} />
      ) : (
        <MoonIcon width={size} height={size} />
      )}
    </IconButton>
  )
}
