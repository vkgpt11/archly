const key = 'archly.auth.session-id'

export function authSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(key)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.sessionStorage.setItem(key, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}
