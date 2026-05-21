import type { ComponentProps } from 'react';
import { isLocalImage, isSvg, buildOptimizedUrl, DEFAULT_WIDTH } from '@/lib/image-utils';

type MDXImageProps = ComponentProps<'img'>;

export function MDXImage({ src, alt, ...props }: MDXImageProps) {
  if (!src) return null;

  const optimize = isLocalImage(src) && !isSvg(src);
  const imgSrc = optimize ? buildOptimizedUrl(src, DEFAULT_WIDTH) : src;

  return <img src={imgSrc} alt={alt ?? ''} loading='lazy' decoding='async' {...props} />;
}
