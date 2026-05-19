import { defineErrorHandler, HTTPError } from 'nitro';

export default defineErrorHandler((error, _event) => {
  const status = HTTPError.isError(error) ? error.status : 500;
  const message = error.message || 'Internal Server Error';

  return new Response(JSON.stringify({ error: true, status, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
});
