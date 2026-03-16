import { renderToPipeableStream, type RenderToPipeableStreamOptions } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { App } from './App'

export function render(url: string, options?: RenderToPipeableStreamOptions) {
  const pathname = new URL(url, 'http://localhost').pathname

  return renderToPipeableStream(
    <StaticRouter location={pathname}>
      <App />
    </StaticRouter>,
    options,
  )
}
