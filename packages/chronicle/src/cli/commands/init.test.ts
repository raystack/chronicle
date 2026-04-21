import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { parse } from 'yaml'
import { chronicleConfigSchema } from '@/types'
import { runInit } from './init'

let tmp: string

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-init-'))
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe('runInit', () => {
  test('scaffolds content/<dir>/, chronicle.yaml and .gitignore from empty', () => {
    const events = runInit(tmp)
    const created = events.filter(e => e.type === 'created').map(e => e.path)
    expect(created).toContain(path.join(tmp, 'content/docs'))
    expect(created).toContain(path.join(tmp, 'chronicle.yaml'))
    expect(created).toContain(path.join(tmp, 'content/docs/index.mdx'))
    expect(created).toContain(path.join(tmp, '.gitignore'))
  })

  test('emitted chronicle.yaml passes the schema', () => {
    runInit(tmp)
    const raw = fs.readFileSync(path.join(tmp, 'chronicle.yaml'), 'utf-8')
    const parsed = chronicleConfigSchema.parse(parse(raw))
    expect(parsed.site.title).toBe('My Documentation')
    expect(parsed.content).toEqual([{ dir: 'docs', label: 'Docs' }])
  })

  test('skips chronicle.yaml when it already exists', () => {
    fs.writeFileSync(path.join(tmp, 'chronicle.yaml'), 'site:\n  title: Mine\n')
    const events = runInit(tmp)
    const yamlEvent = events.find(e => e.path.endsWith('chronicle.yaml'))
    expect(yamlEvent?.type).toBe('skipped')
    const raw = fs.readFileSync(path.join(tmp, 'chronicle.yaml'), 'utf-8')
    expect(raw).toBe('site:\n  title: Mine\n')
  })

  test('does not overwrite an index.mdx already present in content/docs', () => {
    fs.mkdirSync(path.join(tmp, 'content/docs'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'content/docs/existing.mdx'), '# Keep')
    runInit(tmp)
    expect(fs.existsSync(path.join(tmp, 'content/docs/index.mdx'))).toBe(false)
  })

  test('appends missing entries to an existing .gitignore', () => {
    fs.writeFileSync(path.join(tmp, '.gitignore'), 'node_modules\n')
    const events = runInit(tmp)
    const gitignoreEvent = events.find(e => e.path.endsWith('.gitignore'))
    expect(gitignoreEvent?.type).toBe('updated')
    const contents = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf-8')
    expect(contents).toContain('dist')
    expect(contents).toContain('.output')
  })
})
