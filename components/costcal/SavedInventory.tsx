'use client'
import { useEffect, useState } from 'react'
import { Trash2, ImageIcon, Package } from 'lucide-react'
import { getCostings, getFabrics, deleteCosting, type Costing, type Fabric } from '@/lib/costcal-storage'

export default function SavedInventory() {
  const [costings, setCostings] = useState<Costing[]>([])
  const [fabricMap, setFabricMap] = useState<Record<string, Fabric>>({})
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [c, f] = await Promise.all([getCostings(), getFabrics()])
    setCostings(c)
    setFabricMap(Object.fromEntries(f.map(x => [x.id, x])))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const del = async (id: string) => {
    if (!confirm('Delete this costing?')) return
    await deleteCosting(id); load()
  }

  const fmt = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (loading) return <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Costumes Inventory</h2>
        <p className="text-sm text-gray-500 mt-0.5">{costings.length} saved costing{costings.length !== 1 ? 's' : ''}</p>
      </div>

      {costings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No costings saved yet. Use the Cost Calculator to save your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {costings.map(c => {
            const fabric = c.fabricId ? fabricMap[c.fabricId] : null
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="h-36 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.code} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{c.code}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fabric ? fabric.name : 'Pre-made / No Fabric'}</p>
                    </div>
                    <button onClick={() => del(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm border-t border-gray-100 pt-3">
                    <div className="flex justify-between text-gray-500">
                      <span>Production Cost</span>
                      <span>LKR {fmt(c.totalProductionCost)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Net Profit</span>
                      <span className={c.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>LKR {fmt(c.netProfit)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2 mt-2">
                      <span>Selling Price</span>
                      <span>LKR {fmt(c.sellingPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
