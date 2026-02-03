'use client'

import NextImage from 'next/image'
import type { ComponentProps } from 'react'

type ImageProps = ComponentProps<'img'> & {
  width?: number | string
  height?: number | string
}

export function Image({ src, alt, width, height, ...props }: ImageProps) {
  if (!src) return null

  const isExternal = src.startsWith('http://') || src.startsWith('https://')

  if (isExternal) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ''}
        width={width}
        height={height}
        {...props}
      />
    )
  }

  return (
    <NextImage
      src={src}
      alt={alt ?? ''}
      width={typeof width === 'string' ? parseInt(width, 10) : (width ?? 800)}
      height={typeof height === 'string' ? parseInt(height, 10) : (height ?? 400)}
      {...props}
    />
  )
}
