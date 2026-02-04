import '@raystack/apsara/style.css'
import type { Metadata } from 'next'
import { loadConfig } from '../lib/config'
import { Providers } from './providers'

const config = loadConfig()

export const metadata: Metadata = {
  title: config.title,
  description: config.description,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
