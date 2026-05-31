import { getCached, setCached, invalidateCache } from './admin-cache'

export interface Fabric {
  id: string
  name: string
  buyingDate: string
  supplierName: string
  supplierMobile?: string
  description?: string
  costPerUnit: number
  quantity?: number
  unit?: 'Yards' | 'KG' | 'Pieces' | 'Rolls'
  estimatedPieces?: number
  totalCost: number
  images?: string[]
  createdAt: number
}

const CACHE_KEY = 'fabrics'

// Fabrics — stored in Supabase via API, cached in sessionStorage
export async function getFabrics(force = false): Promise<Fabric[]> {
  if (!force) {
    const cached = getCached<Fabric[]>(CACHE_KEY)
    if (cached) return cached
  }
  const res = await fetch('/api/costcal/fabrics')
  if (!res.ok) return []
  const data = await res.json()
  const fabrics = data.data?.fabrics ?? []
  setCached(CACHE_KEY, fabrics)
  return fabrics
}

export async function getFabric(id: string): Promise<Fabric | null> {
  const fabrics = await getFabrics()
  return fabrics.find(f => f.id === id) ?? null
}

export async function addFabric(data: Omit<Fabric, 'id' | 'createdAt'>): Promise<Fabric> {
  const res = await fetch('/api/costcal/fabrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  invalidateCache(CACHE_KEY)
  return json.data.fabric
}

export async function updateFabric(id: string, data: Partial<Fabric>): Promise<Fabric> {
  const res = await fetch(`/api/costcal/fabrics/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  invalidateCache(CACHE_KEY)
  return json.data.fabric
}

export async function deleteFabric(id: string): Promise<void> {
  await fetch(`/api/costcal/fabrics/${id}`, { method: 'DELETE' })
  invalidateCache(CACHE_KEY)
}
