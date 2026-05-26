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

// Fabrics — stored in Supabase via API
export async function getFabrics(): Promise<Fabric[]> {
  const res = await fetch('/api/costcal/fabrics')
  if (!res.ok) return []
  const data = await res.json()
  return data.data?.fabrics ?? []
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
  return json.data.fabric
}

export async function updateFabric(id: string, data: Partial<Fabric>): Promise<Fabric> {
  const res = await fetch(`/api/costcal/fabrics/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  return json.data.fabric
}

export async function deleteFabric(id: string): Promise<void> {
  await fetch(`/api/costcal/fabrics/${id}`, { method: 'DELETE' })
}
