// In-session cache backed by sessionStorage.
// Data survives React navigation but clears on tab close or logout.

const PREFIX = 'adum_adm_'
const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { data, at, ttl } = JSON.parse(raw)
    if (Date.now() - at > (ttl ?? DEFAULT_TTL_MS)) {
      sessionStorage.removeItem(PREFIX + key)
      return null
    }
    return data as T
  } catch { return null }
}

export function setCached(key: string, data: unknown, ttlMs = DEFAULT_TTL_MS): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ data, at: Date.now(), ttl: ttlMs }))
  } catch {}
}

export function invalidateCache(...keys: string[]): void {
  if (typeof window === 'undefined') return
  try { keys.forEach(k => sessionStorage.removeItem(PREFIX + k)) } catch {}
}

export function clearAdminCache(): void {
  if (typeof window === 'undefined') return
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => sessionStorage.removeItem(k))
  } catch {}
}
