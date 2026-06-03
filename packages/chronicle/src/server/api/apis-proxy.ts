import { defineHandler, HTTPError } from 'nitro';
import { loadConfig } from '@/lib/config';
import { loadApiSpecs } from '@/lib/openapi';

const MAX_BODY_SIZE = 1_048_576; // 1 MB
const UPSTREAM_TIMEOUT_MS = 30_000;

interface ProxyRequest {
  specName: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

function isPathSafe(p: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(p);
  } catch {
    return false;
  }
  if (/^[a-z]+:\/\//i.test(decoded)) return false;
  const normalized = new URL(decoded, 'http://localhost').pathname;
  return !normalized.split('/').includes('..');
}

export default defineHandler(async event => {
  if (event.req.method !== 'POST') {
    throw new HTTPError({ status: 405, message: 'Method not allowed' });
  }

  const contentLength = parseInt(event.req.headers.get('content-length') ?? '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    throw new HTTPError({ status: 413, message: `Request body too large (max ${MAX_BODY_SIZE} bytes)` });
  }

  const { specName, method, path, headers, body } =
    (await event.req.json()) as ProxyRequest;

  if (!specName || !method || !path) {
    throw new HTTPError({
      status: 400,
      message: 'Missing specName, method, or path'
    });
  }

  const config = loadConfig();
  const specs = await loadApiSpecs(config.api ?? []);
  const spec = specs.find(s => s.name === specName);

  if (!spec) {
    throw new HTTPError({ status: 404, message: `Unknown spec: ${specName}` });
  }

  if (!isPathSafe(path)) {
    throw new HTTPError({ status: 400, message: 'Invalid path' });
  }

  const url = spec.server.url + path;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const contentType = response.headers.get('content-type') ?? '';
    const responseBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    const sensitiveHeaders = new Set(['set-cookie', 'authorization', 'proxy-authorization', 'cookie']);
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      if (!sensitiveHeaders.has(k.toLowerCase())) responseHeaders[k] = v;
    });

    return Response.json({
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
      headers: responseHeaders
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new HTTPError({ status: 504, message: `Upstream request timed out after ${UPSTREAM_TIMEOUT_MS}ms` });
    }
    const message =
      error instanceof Error
        ? `${error.message}${error.cause ? `: ${(error.cause as Error).message}` : ''}`
        : 'Request failed';
    throw new HTTPError({
      status: 502,
      message: `Could not reach ${url}\n${message}`
    });
  }
});
