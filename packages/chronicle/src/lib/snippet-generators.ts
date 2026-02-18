interface SnippetOptions {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

export function generateCurl({ method, url, headers, body }: SnippetOptions): string {
  const parts = [`curl -X ${method} '${url}'`]
  for (const [key, value] of Object.entries(headers)) {
    parts.push(`  -H '${key}: ${value}'`)
  }
  if (body) {
    parts.push(`  -d '${body}'`)
  }
  return parts.join(' \\\n')
}

export function generatePython({ method, url, headers, body }: SnippetOptions): string {
  const lines: string[] = ['import requests', '']
  const methodLower = method.toLowerCase()
  const headerEntries = Object.entries(headers)

  lines.push(`response = requests.${methodLower}(`)
  lines.push(`    "${url}",`)

  if (headerEntries.length > 0) {
    lines.push('    headers={')
    for (const [key, value] of headerEntries) {
      lines.push(`        "${key}": "${value}",`)
    }
    lines.push('    },')
  }

  if (body) {
    lines.push(`    json=${body},`)
  }

  lines.push(')')
  lines.push('print(response.json())')
  return lines.join('\n')
}

export function generateGo({ method, url, headers, body }: SnippetOptions): string {
  const lines: string[] = []

  if (body) {
    lines.push('payload := strings.NewReader(`' + body + '`)')
    lines.push('')
    lines.push(`req, _ := http.NewRequest("${method}", "${url}", payload)`)
  } else {
    lines.push(`req, _ := http.NewRequest("${method}", "${url}", nil)`)
  }

  for (const [key, value] of Object.entries(headers)) {
    lines.push(`req.Header.Set("${key}", "${value}")`)
  }

  lines.push('')
  lines.push('resp, _ := http.DefaultClient.Do(req)')
  lines.push('defer resp.Body.Close()')
  return lines.join('\n')
}

export function generateTypeScript({ method, url, headers, body }: SnippetOptions): string {
  const lines: string[] = []
  const headerEntries = Object.entries(headers)

  lines.push(`const response = await fetch("${url}", {`)
  lines.push(`  method: "${method}",`)

  if (headerEntries.length > 0) {
    lines.push('  headers: {')
    for (const [key, value] of headerEntries) {
      lines.push(`    "${key}": "${value}",`)
    }
    lines.push('  },')
  }

  if (body) {
    lines.push(`  body: JSON.stringify(${body}),`)
  }

  lines.push('});')
  lines.push('const data = await response.json();')
  return lines.join('\n')
}
