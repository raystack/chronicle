import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chronicleConfigSchema } from '@/types'
import { buildContentMirror } from './scaffold'

let tmp: string
let projectRoot: string
let mirrorRoot: string

async function seedContent(relPath: string, file = 'index.mdx'): Promise<void> {
  const dir = path.join(projectRoot, relPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, file), `---\ntitle: ${relPath}\n---\n`)
}

async function readMirror(relPath: string): Promise<string> {
  return fs.readlink(path.join(mirrorRoot, relPath))
}

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'chronicle-scaffold-'))
  projectRoot = path.join(tmp, 'project')
  mirrorRoot = path.join(tmp, 'mirror')
  await fs.mkdir(projectRoot, { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true })
})

describe('buildContentMirror', () => {
  test('creates symlinks for single-content latest config', async () => {
    await seedContent('content/docs')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect(await readMirror('docs')).toBe(path.join(projectRoot, 'content/docs'))
    const entries = await fs.readdir(mirrorRoot)
    expect(entries.sort()).toEqual(['docs'])
  })

  test('creates symlinks for multi-content latest config', async () => {
    await seedContent('content/docs')
    await seedContent('content/dev')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [
        { dir: 'docs', label: 'Docs' },
        { dir: 'dev', label: 'Dev' },
      ],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect(await readMirror('docs')).toBe(path.join(projectRoot, 'content/docs'))
    expect(await readMirror('dev')).toBe(path.join(projectRoot, 'content/dev'))
  })

  test('creates nested symlinks for versioned config', async () => {
    await seedContent('content/docs')
    await seedContent('versions/v1/docs')
    await seedContent('versions/v1/dev')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
      latest: { label: '2.0' },
      versions: [
        {
          dir: 'v1',
          label: '1.0',
          content: [
            { dir: 'docs', label: 'Docs' },
            { dir: 'dev', label: 'Dev' },
          ],
        },
      ],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect(await readMirror('docs')).toBe(path.join(projectRoot, 'content/docs'))
    expect(await readMirror('v1/docs')).toBe(
      path.join(projectRoot, 'versions/v1/docs'),
    )
    expect(await readMirror('v1/dev')).toBe(
      path.join(projectRoot, 'versions/v1/dev'),
    )
  })

  test('is idempotent — re-running yields the same mirror', async () => {
    await seedContent('content/docs')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)
    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect(await readMirror('docs')).toBe(path.join(projectRoot, 'content/docs'))
  })

  test('wipes stale entries when config changes', async () => {
    await seedContent('content/docs')
    await seedContent('content/dev')
    const before = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [
        { dir: 'docs', label: 'Docs' },
        { dir: 'dev', label: 'Dev' },
      ],
    })

    await buildContentMirror(mirrorRoot, projectRoot, before)
    expect((await fs.readdir(mirrorRoot)).sort()).toEqual(['dev', 'docs'])

    const after = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })
    await buildContentMirror(mirrorRoot, projectRoot, after)

    expect(await fs.readdir(mirrorRoot)).toEqual(['docs'])
  })

  test('replaces a legacy single-symlink mirror', async () => {
    await seedContent('content/docs')
    await fs.symlink(path.join(projectRoot, 'content/docs'), mirrorRoot)

    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })
    await buildContentMirror(mirrorRoot, projectRoot, config)

    const stat = await fs.lstat(mirrorRoot)
    expect(stat.isDirectory()).toBe(true)
    expect(await readMirror('docs')).toBe(path.join(projectRoot, 'content/docs'))
  })
})
