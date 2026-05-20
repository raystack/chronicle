import type { ComponentProps } from 'react'
import { isLocalImage, isSvg, buildOptimizedUrl } from '@/lib/image-utils'

type ImageProps = ComponentProps<'img'>

export function Image({ src, alt, ...props }: ImageProps) {
  if (!src) return null

  const optimize = isLocalImage(src) && !isSvg(src)
  const imgSrc = optimize ? buildOptimizedUrl(src, 1024) : src

  return <img src={imgSrc} alt={alt ?? ''} loading='lazy' decoding='async' {...props} />
}
