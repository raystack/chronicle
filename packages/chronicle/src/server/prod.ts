import path from 'path'
import chalk from 'chalk'

export interface ProdServerOptions {
  port: number
  root: string
  distDir: string
}

export async function startProdServer(options: ProdServerOptions) {
  const { port, distDir } = options

  const serverEntry = path.resolve(distDir, 'server/entry-prod.js')
  const { startServer } = await import(serverEntry)

  console.log(chalk.cyan('Starting production server...'))
  return startServer({ port, distDir })
}
