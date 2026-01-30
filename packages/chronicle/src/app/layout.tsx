import '@raystack/apsara/index.css'
import type { Metadata } from 'next'
import { loadConfig } from '../lib/config'

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
      <body>{children}</body>
    </html>
  )
}
