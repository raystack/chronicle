import { defineHandler } from 'nitro';
import React from 'react';
import satori from 'satori';
import { loadConfig } from '@/lib/config';
import { loadFont, loadLogo } from './og-utils';

let fontData: ArrayBuffer | null = null;
let cachedLogo: string | null | undefined;

export default defineHandler(async event => {
  const config = loadConfig();
  const title = event.url.searchParams.get('title') ?? config.site.title;
  const description = event.url.searchParams.get('description') ?? '';
  const authors = event.url.searchParams.get('authors') ?? '';
  const siteName = config.site.title;

  if (!fontData) fontData = await loadFont(__CHRONICLE_PACKAGE_ROOT__);
  if (cachedLogo === undefined) {
    cachedLogo = config.logo?.dark
      ? await loadLogo(__CHRONICLE_PROJECT_ROOT__, config.logo.dark)
      : null;
  }

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
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        {cachedLogo && (
          <img
            src={cachedLogo}
            width={48}
            height={48}
            style={{ marginRight: 16 }}
          />
        )}
        <div style={{ fontSize: 32, color: '#888' }}>
          {siteName}
        </div>
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
      {authors && (
        <div style={{ fontSize: 22, color: '#777', marginTop: 24 }}>
          {`By ${authors}`}
        </div>
      )}
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: fontData, weight: 400, style: 'normal' as const },
      ],
    },
  );

  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });
});
