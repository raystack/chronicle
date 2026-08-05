import sharp from 'sharp';
import { isAnimatable } from './image-utils';

// Server-only: keeps the `sharp` import out of image-utils.ts, which is shared
// with the client bundle.

/**
 * True when the file holds more than one frame. sharp decodes only the first
 * frame unless constructed with `{ animated: true }`, so callers need this to
 * avoid flattening animated GIF/WebP sources.
 */
export async function isAnimatedImage(filePath: string): Promise<boolean> {
  if (!isAnimatable(filePath)) return false;
  try {
    const { pages } = await sharp(filePath).metadata();
    return (pages ?? 1) > 1;
  } catch {
    return false;
  }
}
