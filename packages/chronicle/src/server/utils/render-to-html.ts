import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

export function renderToHtml(element: ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        const passthrough = new PassThrough();
        passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
        passthrough.on('end', () => resolve(Buffer.concat(chunks).toString()));
        passthrough.on('error', reject);
        pipe(passthrough);
      },
      onError: reject,
    });
  });
}
