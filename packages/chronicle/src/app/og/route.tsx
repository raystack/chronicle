import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { loadConfig } from '@/lib/config'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') ?? loadConfig().title
  const description = searchParams.get('description') ?? ''
  const siteName = loadConfig().title

  return new ImageResponse(
    (
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
        <div
          style={{
            fontSize: 24,
            color: '#888',
            marginBottom: 16,
          }}
        >
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
          <div
            style={{
              fontSize: 24,
              color: '#999',
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
