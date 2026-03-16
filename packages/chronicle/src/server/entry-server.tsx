import { renderToPipeableStream, type RenderToPipeableStreamOptions } from 'react-dom/server'
import { App } from './App'

export function render(url: string, options?: RenderToPipeableStreamOptions) {
  // Phase 2 will add routing based on url to render docs/api pages
  const stream = renderToPipeableStream(
    <App>
      <div data-ssr-url={url}>
        <h1>Chronicle</h1>
        <p>Server rendering working. URL: {url}</p>
      </div>
    </App>,
    options,
  )

  return stream
}
