import { defineHandler } from 'nitro';
import React from 'react';
import satori from 'satori';
import { loadConfig } from '@/lib/config';

let fontData: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;

  try {
    const response = await fetch(
      'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2'
    );
    fontData = await response.arrayBuffer();
  } catch {
    fontData = new ArrayBuffer(0);
  }

  return fontData;
}

export default defineHandler(async event => {
  const config = loadConfig();
  const title = event.url.searchParams.get('title') ?? config.site.title;
  const description = event.url.searchParams.get('description') ?? '';
  const siteName = config.site.title;

  const font = await loadFont();

  const svg = await satori(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        backgroundColor: '#0a0a0a',
        color: '#fafafa',
      }}
    >
      <div style={{ fontSize: 24, color: '#888', marginBottom: 16 }}>
        {siteName}
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: 24,
        }}
      >
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 24, color: '#999', lineHeight: 1.4 }}>
          {description}
        </div>
      )}
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: font, weight: 400, style: 'normal' as const },
      ],
    },
  );

  event.res.headers.set('Content-Type', 'image/svg+xml');
  event.res.headers.set('Cache-Control', 'public, max-age=86400');
  return svg;
});
