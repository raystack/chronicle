export function isStaticMode(): boolean {
  return typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__STATIC_MODE__ === true;
}
