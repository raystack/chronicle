import { describe, it, expect } from 'vitest'
import { detectPackageManager } from '../utils/scaffold'

describe('detectPackageManager', () => {
  it('returns a string', () => {
    const result = detectPackageManager()
    expect(typeof result).toBe('string')
    expect(['npm', 'bun', 'pnpm', 'yarn']).toContain(result)
  })
})
