import localforage from 'localforage'

const fabricStore = localforage.createInstance({ name: 'cost-calculator', storeName: 'fabrics' })
const costingStore = localforage.createInstance({ name: 'cost-calculator', storeName: 'costings' })

export interface Fabric {
  id: string
  name: string
  buyingDate: string            // ISO date string (YYYY-MM-DD)
  supplierName: string          // required
  supplierMobile?: string       // optional
  description?: string          // optional
  costPerUnit: number           // cost per single unit (LKR)
  quantity?: number
  unit?: 'Yards' | 'KG' | 'Pieces' | 'Rolls'
  estimatedPieces?: number      // forecasted finished garments
  totalCost: number             // costPerUnit × quantity (or costPerUnit if no qty)
  image?: string
  createdAt: number
}

export interface Costing {
  id: string
  code: string
  image?: string
  fabricId?: string
  totalProductionCost: number
  netProfit: number
  sellingPrice: number
  createdAt: number
}

function uuid() {
  return crypto.randomUUID()
}

// Fabrics
export async function getFabrics(): Promise<Fabric[]> {
  const keys = await fabricStore.keys()
  const items = await Promise.all(keys.map(k => fabricStore.getItem<Fabric>(k)))
  return (items.filter(Boolean) as Fabric[]).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getFabric(id: string): Promise<Fabric | null> {
  return fabricStore.getItem<Fabric>(id)
}

export async function addFabric(data: Omit<Fabric, 'id' | 'createdAt'>): Promise<Fabric> {
  const fabric: Fabric = { ...data, id: uuid(), createdAt: Date.now() }
  await fabricStore.setItem(fabric.id, fabric)
  return fabric
}

export async function updateFabric(id: string, data: Partial<Fabric>): Promise<Fabric> {
  const existing = await fabricStore.getItem<Fabric>(id)
  const updated = { ...existing, ...data, id } as Fabric
  await fabricStore.setItem(id, updated)
  return updated
}

export async function deleteFabric(id: string): Promise<void> {
  await fabricStore.removeItem(id)
}

// Costings
export async function getCostings(): Promise<Costing[]> {
  const keys = await costingStore.keys()
  const items = await Promise.all(keys.map(k => costingStore.getItem<Costing>(k)))
  return (items.filter(Boolean) as Costing[]).sort((a, b) => b.createdAt - a.createdAt)
}

export async function addCosting(data: Omit<Costing, 'id' | 'createdAt'>): Promise<Costing> {
  const costing: Costing = { ...data, id: uuid(), createdAt: Date.now() }
  await costingStore.setItem(costing.id, costing)
  return costing
}

export async function deleteCosting(id: string): Promise<void> {
  await costingStore.removeItem(id)
}
