import { defineHandler, HTTPError } from 'nitro';
import { loadConfig } from '@/lib/config';
import { substituteEnvVars } from '@/lib/env';
import { loadApiSpecs } from '@/lib/openapi';

interface ProxyRequest {
  specName: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export default defineHandler(async event => {
  if (event.req.method !== 'POST') {
    throw new HTTPError({ status: 405, message: 'Method not allowed' });
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

  if (/^[a-z]+:\/\//i.test(path) || path.includes('..')) {
    throw new HTTPError({ status: 400, message: 'Invalid path' });
  }

  const url = substituteEnvVars(spec.server.url) + path;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
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
