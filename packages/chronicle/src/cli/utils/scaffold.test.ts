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

async function isDirSymlink(p: string): Promise<boolean> {
  const st = await fs.lstat(p)
  if (!st.isSymbolicLink()) return false
  const target = await fs.stat(p)
  return target.isDirectory()
}

async function symlinkTarget(p: string): Promise<string> {
  const st = await fs.lstat(p)
  expect(st.isSymbolicLink()).toBe(true)
  return fs.readlink(p)
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
  test('single-content latest: creates directory symlink to content source', async () => {
    await seedContent('content/docs', 'index.mdx')
    await seedContent('content/docs', 'guide.mdx')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect(await isDirSymlink(path.join(mirrorRoot, 'docs'))).toBe(true)
    expect(await symlinkTarget(path.join(mirrorRoot, 'docs'))).toBe(
      path.join(projectRoot, 'content/docs'),
    )
    const content = await fs.readFile(path.join(mirrorRoot, 'docs/index.mdx'), 'utf-8')
    expect(content).toContain('title:')
  })

  test('files within symlinked directory are accessible', async () => {
    await seedContent('content/docs/guides', 'install.mdx')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)

    const nested = path.join(mirrorRoot, 'docs/guides/install.mdx')
    const content = await fs.readFile(nested, 'utf-8')
    expect(content).toContain('title:')
  })

  test('multi-content latest produces one symlink per content entry', async () => {
    await seedContent('content/docs', 'index.mdx')
    await seedContent('content/dev', 'index.mdx')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [
        { dir: 'docs', label: 'Docs' },
        { dir: 'dev', label: 'Dev' },
      ],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect(await isDirSymlink(path.join(mirrorRoot, 'docs'))).toBe(true)
    expect(await isDirSymlink(path.join(mirrorRoot, 'dev'))).toBe(true)
    expect(await symlinkTarget(path.join(mirrorRoot, 'dev'))).toBe(
      path.join(projectRoot, 'content/dev'),
    )
  })

  test('versioned mirror nests version dir then content symlink', async () => {
    await seedContent('content/docs', 'index.mdx')
    await seedContent('versions/v1/docs', 'index.mdx')
    await seedContent('versions/v1/dev', 'api.mdx')
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

    expect(await isDirSymlink(path.join(mirrorRoot, 'v1/docs'))).toBe(true)
    expect(await symlinkTarget(path.join(mirrorRoot, 'v1/docs'))).toBe(
      path.join(projectRoot, 'versions/v1/docs'),
    )
    expect(await symlinkTarget(path.join(mirrorRoot, 'v1/dev'))).toBe(
      path.join(projectRoot, 'versions/v1/dev'),
    )
  })

  test('is idempotent — re-running yields the same tree', async () => {
    await seedContent('content/docs', 'index.mdx')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)
    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect(await isDirSymlink(path.join(mirrorRoot, 'docs'))).toBe(true)
    expect(await symlinkTarget(path.join(mirrorRoot, 'docs'))).toBe(
      path.join(projectRoot, 'content/docs'),
    )
  })

  test('wipes stale entries when config shrinks', async () => {
    await seedContent('content/docs', 'index.mdx')
    await seedContent('content/dev', 'index.mdx')
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
    await seedContent('content/docs', 'index.mdx')
    await fs.symlink(path.join(projectRoot, 'content/docs'), mirrorRoot)

    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })
    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect((await fs.lstat(mirrorRoot)).isDirectory()).toBe(true)
    expect(await isDirSymlink(path.join(mirrorRoot, 'docs'))).toBe(true)
  })

  test('throws when content directory does not exist', async () => {
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    await expect(
      buildContentMirror(mirrorRoot, projectRoot, config),
    ).rejects.toThrow('Content directory not found')
  })
})
