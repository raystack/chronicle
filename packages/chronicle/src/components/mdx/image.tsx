import type { ComponentProps } from 'react';
import { isLocalImage, isSvg, buildOptimizedUrl, DEFAULT_WIDTH } from '@/lib/image-utils';
import { isStaticMode } from '@/lib/static-mode';

type MDXImageProps = ComponentProps<'img'>;

function webpUrl(src: string): string {
  return src.replace(/\.[^.]+$/, '.webp');
}

export function MDXImage({ src, alt, ...props }: MDXImageProps) {
  if (!src) return null;

  const optimize = isLocalImage(src) && !isSvg(src);

  if (optimize && isStaticMode()) {
    return (
      <picture>
        <source srcSet={webpUrl(src)} type="image/webp" />
        <img src={src} alt={alt ?? ''} loading='lazy' decoding='async' {...props} />
      </picture>
    );
  }

  const imgSrc = optimize ? buildOptimizedUrl(src, DEFAULT_WIDTH) : src;
  return <img src={imgSrc} alt={alt ?? ''} loading='lazy' decoding='async' {...props} />;
}
