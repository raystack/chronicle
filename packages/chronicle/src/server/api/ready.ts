import { defineHandler } from 'nitro';
import { isSearchReady } from './search';

export default defineHandler(() => {
  const searchReady = isSearchReady();

  if (!searchReady) {
    return Response.json(
      { status: 'not_ready', search: false },
      { status: 503 },
    );
  }

  return Response.json({ status: 'ready', search: true });
});
