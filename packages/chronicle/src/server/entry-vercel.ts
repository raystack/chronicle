// Vercel serverless function entry — built by Vite, deployed as catch-all function
import type { IncomingMessage, ServerResponse } from 'http'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { handleRequest } from './request-handler'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatePath = path.resolve(__dirname, 'index.html')
const template = readFileSync(templatePath, 'utf-8')

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || '/'
  const baseUrl = `https://${req.headers.host || 'localhost'}`

  try {
    const response = await handleRequest(url, { template, baseUrl })

    res.statusCode = response.status
    response.headers.forEach((value: string, key: string) => res.setHeader(key, value))
    const body = await response.text()
    res.end(body)
  } catch (e) {
    console.error(e)
    res.statusCode = 500
    res.end((e as Error).message)
  }
}
