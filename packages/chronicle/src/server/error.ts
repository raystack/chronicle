import { defineErrorHandler, HTTPError } from 'nitro';

export default defineErrorHandler(async (error, _event) => {
  const status = HTTPError.isError(error) ? error.status : 500;
  const message = error.message || 'Internal Server Error';

  // MDX failures in content (syntax errors, unknown components) surface here:
  // the eager frontmatter glob in source.ts compiles every content file at
  // module load, before the SSR fetch handler can catch anything.
  if (import.meta.env.DEV) {
    const { renderMdxErrorResponse } = await import('./dev-error-page');
    const candidates = [error, (error as { cause?: unknown }).cause];
    for (const candidate of candidates) {
      const response = candidate ? await renderMdxErrorResponse(candidate) : null;
      if (response) return response;
    }
  }

  return new Response(JSON.stringify({ error: true, status, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
});
