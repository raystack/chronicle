import fs from 'node:fs/promises';
import path from 'node:path';
import { definePlugin } from 'nitro';
import { useStorage } from 'nitro/storage';
import { STORAGE_KEY, cacheKey, optimizeImage } from '@/server/api/image';
import { DEFAULT_WIDTH, DEFAULT_QUALITY, isLocalImage, isSvg } from '@/lib/image-utils';
import { safePath } from '@/server/utils/safe-path';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

async function findImages(dir: string): Promise<string[]> {
  const images: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      const stat = await fs.stat(fullPath).catch(() => null);
      if (stat?.isDirectory()) {
        images.push(...await findImages(fullPath));
      }
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      images.push(fullPath);
    }
  }
  return images;
}

export default definePlugin(() => {
  return {
    name: 'image-warmup',
    async setup(nitroApp) {
      nitroApp.hooks.hookOnce('afterResponse', async () => {
        const contentDir = __CHRONICLE_CONTENT_DIR__;
        const storage = useStorage(STORAGE_KEY);
        const format = 'webp' as const;
        const w = DEFAULT_WIDTH;
        const q = DEFAULT_QUALITY;

        const images = await findImages(contentDir);
        let warmed = 0;

        for (const filePath of images) {
          const relativePath = path.relative(contentDir, filePath);
          const url = `/_content/${relativePath.split(path.sep).join('/')}`;
          const key = cacheKey(url, w, q, format);

          const cached = await storage.getItemRaw(key);
          if (cached) continue;

          try {
            const optimized = await optimizeImage(filePath, w, q, format);
            await storage.setItemRaw(key, optimized);
            warmed++;
          } catch {
            // skip unprocessable images
          }
        }

        if (warmed > 0) {
          console.log(`[image-warmup] cached ${warmed} images as webp@${w}w`);
        }
      });
    },
  };
});
