import type { ComponentProps } from 'react';
import { isLocalImage, isSvg, buildOptimizedUrl, webpUrl, splitVersion, DEFAULT_WIDTH } from '@/lib/image-utils';
import { isStaticMode } from '@/lib/static-mode';

type MDXImageProps = ComponentProps<'img'>;

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

  if (optimize) {
    const { base, version } = splitVersion(src);
    const imgSrc = buildOptimizedUrl(base, DEFAULT_WIDTH, undefined, version);
    return <img src={imgSrc} alt={alt ?? ''} loading='lazy' decoding='async' {...props} />;
  }

  return <img src={src} alt={alt ?? ''} loading='lazy' decoding='async' {...props} />;
}
