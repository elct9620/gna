export function expiresAt(ttlMs: number): string {
  return new Date(Date.now() + ttlMs).toISOString();
}
