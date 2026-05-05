export async function adminFetch(path: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers ?? {}) },
  })
  const data = await res.json()
  if (!data.success && res.status >= 400) throw new Error(data.message ?? 'Request failed')
  return data
}
