import { defineHandler } from 'nitro';
import { ensureIndex, isSearchReady } from './search';
import { warmupImageCache } from './image';
import { LATEST_CONTEXT } from '@/lib/version-source';

export default defineHandler(async () => {
  ensureIndex(LATEST_CONTEXT).catch(e => console.error('[search:index]', e));
  warmupImageCache().catch(e => console.error('[image-warmup]', e));

  if (!isSearchReady()) {
    return new Response(JSON.stringify({ status: 'not_ready', search: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ status: 'ready', search: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
