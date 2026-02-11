import type { ChildProcess } from 'child_process'

export function attachLifecycleHandlers(child: ChildProcess) {
  child.on('close', (code) => process.exit(code ?? 0))
  process.on('SIGINT', () => child.kill('SIGINT'))
  process.on('SIGTERM', () => child.kill('SIGTERM'))
}
