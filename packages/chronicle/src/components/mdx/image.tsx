'use client'

import type { ComponentProps } from 'react'

type ImageProps = Omit<ComponentProps<'img'>, 'src'> & {
  src?: string
  width?: number | string
  height?: number | string
}

export function Image({ src, alt, width, height, ...props }: ImageProps) {
  if (!src || typeof src !== 'string') return null

  return (
    <img
      src={src}
      alt={alt ?? ''}
      width={width}
      height={height}
      loading="lazy"
      {...props}
    />
  )
}
