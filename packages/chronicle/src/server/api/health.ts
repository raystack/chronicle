import { defineHandler } from 'nitro';

export default defineHandler(() => {
  return Response.json({ status: 'ok' });
});
