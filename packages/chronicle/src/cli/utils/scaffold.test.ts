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

async function isDir(p: string): Promise<boolean> {
  return (await fs.lstat(p)).isDirectory()
}

async function fileSymlinkTarget(p: string): Promise<string> {
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
  test('single-content latest: mirrors as real dirs with per-file symlinks', async () => {
    await seedContent('content/docs', 'index.mdx')
    await seedContent('content/docs', 'guide.mdx')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect(await isDir(path.join(mirrorRoot, 'docs'))).toBe(true)
    expect(await fileSymlinkTarget(path.join(mirrorRoot, 'docs/index.mdx'))).toBe(
      path.join(projectRoot, 'content/docs/index.mdx'),
    )
    expect(await fileSymlinkTarget(path.join(mirrorRoot, 'docs/guide.mdx'))).toBe(
      path.join(projectRoot, 'content/docs/guide.mdx'),
    )
  })

  test('preserves nested subdirectories via recursive mirror', async () => {
    await seedContent('content/docs/guides', 'install.mdx')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)

    const nested = path.join(mirrorRoot, 'docs/guides/install.mdx')
    expect(await fileSymlinkTarget(nested)).toBe(
      path.join(projectRoot, 'content/docs/guides/install.mdx'),
    )
    expect(await isDir(path.join(mirrorRoot, 'docs/guides'))).toBe(true)
  })

  test('multi-content latest produces one real dir per content entry', async () => {
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

    expect(await isDir(path.join(mirrorRoot, 'docs'))).toBe(true)
    expect(await isDir(path.join(mirrorRoot, 'dev'))).toBe(true)
    expect(
      await fileSymlinkTarget(path.join(mirrorRoot, 'dev/index.mdx')),
    ).toBe(path.join(projectRoot, 'content/dev/index.mdx'))
  })

  test('versioned mirror nests version dir then content dir', async () => {
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

    expect(await isDir(path.join(mirrorRoot, 'v1/docs'))).toBe(true)
    expect(
      await fileSymlinkTarget(path.join(mirrorRoot, 'v1/docs/index.mdx')),
    ).toBe(path.join(projectRoot, 'versions/v1/docs/index.mdx'))
    expect(
      await fileSymlinkTarget(path.join(mirrorRoot, 'v1/dev/api.mdx')),
    ).toBe(path.join(projectRoot, 'versions/v1/dev/api.mdx'))
  })

  test('is idempotent — re-running yields the same tree', async () => {
    await seedContent('content/docs', 'index.mdx')
    const config = chronicleConfigSchema.parse({
      site: { title: 'x' },
      content: [{ dir: 'docs', label: 'Docs' }],
    })

    await buildContentMirror(mirrorRoot, projectRoot, config)
    await buildContentMirror(mirrorRoot, projectRoot, config)

    expect(
      await fileSymlinkTarget(path.join(mirrorRoot, 'docs/index.mdx')),
    ).toBe(path.join(projectRoot, 'content/docs/index.mdx'))
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

    expect(await isDir(mirrorRoot)).toBe(true)
    expect(
      await fileSymlinkTarget(path.join(mirrorRoot, 'docs/index.mdx')),
    ).toBe(path.join(projectRoot, 'content/docs/index.mdx'))
  })
})
