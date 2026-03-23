import type { ComponentProps } from 'react';

type ImageProps = ComponentProps<'img'>;

export function Image({ src, alt, ...props }: ImageProps) {
  if (!src) return null;

  return <img src={src} alt={alt ?? ''} loading='lazy' {...props} />;
}
