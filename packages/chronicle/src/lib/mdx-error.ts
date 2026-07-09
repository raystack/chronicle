export interface MdxErrorInfo {
  /** Human-readable reason, without file/position noise. */
  message: string
  /** Absolute path of the failing content file, when known. */
  file?: string
  line?: number
  column?: number
}

export interface CodeFrame {
  lines: Array<{ number: number; text: string; target: boolean }>
  /** 1-based caret column on the target line, when known. */
  caretColumn?: number
}

interface ErrorLike {
  message?: string
  reason?: string
  file?: string
  line?: number
  column?: number
  place?: { line?: number; column?: number; start?: { line?: number; column?: number } }
  loc?: { file?: string; line?: number; column?: number }
  id?: string
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: strips ANSI color codes
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g

const isContentFile = (p?: string): p is string => !!p && /\.mdx?$/.test(p.split('?')[0])

function cleanMessage(raw: string): string {
  const lines = raw
    .replace(ANSI_PATTERN, '')
    .split('\n')
    .map(line =>
      line
        .replace(/^\[(?:plugin|vite)[^\]]*\]\s*/, '')
        .replace(/^\S*\.mdx?(?::[\d:-]+)*:?\s*/, '')
        .trim(),
    )
    .filter(line => line && !/^Build failed with \d+ errors?:?$/.test(line))
  return lines[0] ?? raw.trim()
}

/**
 * Extracts file/position info from the various error shapes an MDX failure
 * can surface as: a VFileMessage (parse errors, remark plugin `file.fail`),
 * a Rollup/Vite transform error (`loc`/`id`), or MDX's runtime
 * `_missingMdxReference` throw. Returns null for errors unrelated to MDX.
 */
export function parseMdxError(err: unknown): MdxErrorInfo | null {
  if (!err || typeof err !== 'object') return null
  const e = err as ErrorLike
  const rawMessage = e.reason || e.message || ''

  // MDX runtime: unknown component reached rendering (no file context available)
  const missing = rawMessage.match(/Expected component `([^`]+)` to be defined/)
  if (missing) {
    return { message: `Unknown component <${missing[1]}> — it is not registered in Chronicle's MDX components.` }
  }

  const file = [e.file, e.loc?.file, e.id, ...(rawMessage.match(/((?:\/|\.\.?\/)[^\s:]+\.mdx?)/) ?? [])]
    .find(isContentFile)
  if (!file) return null

  const place = e.place?.start ?? e.place
  let line = e.line ?? place?.line ?? e.loc?.line
  let column = e.column ?? place?.column ?? e.loc?.column
  if (line == null) {
    // Fall back to `12:3` or `12:3-14:1` position embedded in the message text
    const pos = rawMessage.match(/(\d+):(\d+)(?:-\d+:\d+)?/)
    if (pos) {
      line = Number(pos[1])
      column = Number(pos[2])
    }
  }

  return { message: cleanMessage(rawMessage), file: file.split('?')[0], line, column }
}

export function buildCodeFrame(source: string, line: number, column?: number, context = 2): CodeFrame {
  const all = source.split(/\r?\n/)
  const start = Math.max(1, line - context)
  const end = Math.min(all.length, line + context)
  const lines = []
  for (let n = start; n <= end; n++) {
    lines.push({ number: n, text: all[n - 1] ?? '', target: n === line })
  }
  return { lines, caretColumn: column }
}
