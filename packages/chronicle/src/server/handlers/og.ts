import satori from 'satori'
import { loadConfig } from '@/lib/config'

let fontData: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData

  try {
    const response = await fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2')
    fontData = await response.arrayBuffer()
  } catch {
    // Fallback: create minimal valid font buffer
    fontData = new ArrayBuffer(0)
  }

  return fontData
}

export async function handleOg(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const title = url.searchParams.get('title') ?? loadConfig().title
  const description = url.searchParams.get('description') ?? ''
  const siteName = loadConfig().title

  const font = await loadFont()

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          backgroundColor: '#0a0a0a',
          color: '#fafafa',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { fontSize: 24, color: '#888', marginBottom: 16 },
              children: siteName,
            },
          },
          {
            type: 'div',
            props: {
              style: { fontSize: 56, fontWeight: 700, lineHeight: 1.2, marginBottom: 24 },
              children: title,
            },
          },
          ...(description ? [{
            type: 'div',
            props: {
              style: { fontSize: 24, color: '#999', lineHeight: 1.4 },
              children: description,
            },
          }] : []),
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: font,
          weight: 400,
          style: 'normal' as const,
        },
      ],
    },
  )

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
