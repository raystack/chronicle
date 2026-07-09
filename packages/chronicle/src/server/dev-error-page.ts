import { buildCodeFrame, type CodeFrame, parseMdxError } from '@/lib/mdx-error'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function displayPath(file: string): string {
  const roots = [
    typeof __CHRONICLE_CONTENT_DIR__ !== 'undefined' ? __CHRONICLE_CONTENT_DIR__ : '',
    typeof __CHRONICLE_PROJECT_ROOT__ !== 'undefined' ? __CHRONICLE_PROJECT_ROOT__ : '',
  ]
  for (const root of roots) {
    if (root && file.startsWith(root)) return file.slice(root.length).replace(/^\//, '')
  }
  return file
}

function frameHtml(frame: CodeFrame): string {
  const gutter = String(frame.lines[frame.lines.length - 1]?.number ?? 0).length
  const rows = frame.lines.flatMap(({ number, text, target }) => {
    const row = `<div class="row${target ? ' target' : ''}"><span class="ln">${target ? '&gt;' : ' '} ${String(number).padStart(gutter)}</span><span class="src">${escapeHtml(text)}</span></div>`
    if (target && frame.caretColumn) {
      return [row, `<div class="row caret"><span class="ln">${' '.repeat(gutter + 1)}</span><span class="src">${' '.repeat(frame.caretColumn - 1)}^</span></div>`]
    }
    return [row]
  })
  return `<pre class="frame">${rows.join('')}</pre>`
}

/**
 * Dev-only: renders a styled error page for MDX failures (syntax errors,
 * unknown components) naming the file, position, and a source code frame.
 * Returns null when the error is not MDX-related.
 */
export async function renderMdxErrorResponse(err: unknown): Promise<Response | null> {
  const info = parseMdxError(err)
  if (!info) return null

  let frame: CodeFrame | null = null
  if (info.file && info.line) {
    try {
      const fs = await import('node:fs/promises')
      frame = buildCodeFrame(await fs.readFile(info.file, 'utf-8'), info.line, info.column)
    } catch {
      // source not readable — show the message without a code frame
    }
  }

  const location = info.file
    ? `${displayPath(info.file)}${info.line ? `:${info.line}${info.column ? `:${info.column}` : ''}` : ''}`
    : null

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MDX Error</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0; padding: 48px 24px;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: #fff; color: #18181b;
    }
    .card { max-width: 860px; margin: 0 auto; }
    .badge {
      display: inline-block; padding: 4px 10px; border-radius: 6px;
      background: #dc2626; color: #fff; font-size: 12px; font-weight: 600;
      letter-spacing: 0.04em; text-transform: uppercase;
    }
    h1 { font-size: 20px; line-height: 1.5; margin: 16px 0 8px; }
    .loc {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px; color: #71717a; margin-bottom: 24px;
    }
    .frame {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px; line-height: 1.7; overflow-x: auto;
      background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px;
      padding: 12px 0; margin: 0;
    }
    .row { display: flex; white-space: pre; }
    .row .ln {
      flex: none; padding: 0 12px; color: #a1a1aa;
      border-right: 1px solid #e4e4e7; margin-right: 12px; user-select: none;
    }
    .row.target { background: rgba(220, 38, 38, 0.08); }
    .row.target .ln, .row.caret .src { color: #dc2626; font-weight: 600; }
    .hint { font-size: 13px; color: #71717a; margin-top: 24px; }
    @media (prefers-color-scheme: dark) {
      body { background: #09090b; color: #f4f4f5; }
      .frame { background: #18181b; border-color: #27272a; }
      .row .ln { border-color: #27272a; color: #52525b; }
      .loc, .hint { color: #a1a1aa; }
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">MDX Error</span>
    <h1>${escapeHtml(info.message)}</h1>
    ${location ? `<div class="loc">${escapeHtml(location)}</div>` : ''}
    ${frame ? frameHtml(frame) : ''}
    <p class="hint">Fix the file and save — the page reloads automatically.</p>
  </div>
  <script>
    (function poll(last) {
      setTimeout(async () => {
        try {
          const res = await fetch(location.href, { headers: { accept: 'text/html' } });
          if (res.ok) return location.reload();
          const body = await res.text();
          if (last !== null && body !== last) return location.reload();
          poll(body);
        } catch {
          poll(last);
        }
      }, 1000);
    })(null);
  </script>
</body>
</html>`

  return new Response(html, {
    status: 500,
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  })
}
