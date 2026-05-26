'use client'
import { useEffect, useState } from 'react'
import { Trash2, ImageIcon, Pencil, Check, X, ChevronDown } from 'lucide-react'
import { adminFetch } from '@/lib/api'

interface ProductInfo {
  id: string
  name: string
  itemCode?: string | null
  images?: { url: string; order: number }[]
  colorVariants?: { images?: { url: string; order: number }[] }[]
}

interface Costing {
  id: string
  productId: string
  totalProductionCost: number
  netProfit: number
  recommendedPrice: number
  originalPrice: number
  sellingPrice: number
  status: string
  createdAt: number
  product?: ProductInfo | null
}

interface EditingRow {
  originalPrice: string
  sellingPrice: string
  status: string
}

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'active', label: 'Active (ORM)' },
  { value: 'inactive', label: 'Inactive' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  active: 'bg-blue-100 text-blue-700',
  inactive: 'bg-red-100 text-red-600',
}

function getThumb(product?: ProductInfo | null): string | null {
  if (!product) return null
  const direct = product.images?.[0]?.url
  if (direct) return direct
  return product.colorVariants?.[0]?.images?.sort((a, b) => a.order - b.order)?.[0]?.url ?? null
}

function fmt(n: number) {
  return n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SavedInventory({ onEditInCalculator }: { onEditInCalculator?: (costing: Costing) => void }) {
  const [costings, setCostings] = useState<Costing[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, EditingRow>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const load = async () => {
    setLoading(true)
    try {
      const d = await adminFetch('/api/costcal/costings')
      setCostings(d.data?.costings ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startEdit = (c: Costing) => {
    setEditing(e => ({
      ...e,
      [c.id]: {
        originalPrice: c.originalPrice > 0 ? String(c.originalPrice) : '',
        sellingPrice: String(c.sellingPrice),
        status: c.status,
      },
    }))
  }

  const cancelEdit = (id: string) => {
    setEditing(e => { const n = { ...e }; delete n[id]; return n })
  }

  const saveRow = async (id: string) => {
    const row = editing[id]
    if (!row) return
    setSaving(s => ({ ...s, [id]: true }))
    try {
      await adminFetch(`/api/costcal/costings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          originalPrice: row.originalPrice ? Number(row.originalPrice) : 0,
          sellingPrice: Number(row.sellingPrice),
          status: row.status,
        }),
      })
      await load()
      cancelEdit(id)
    } finally {
      setSaving(s => ({ ...s, [id]: false }))
    }
  }

  const del = async (id: string) => {
    if (!confirm('Remove this item from inventory?')) return
    await adminFetch(`/api/costcal/costings/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>

  if (costings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <p className="text-gray-400 text-sm">No items in inventory yet.</p>
        <p className="text-gray-300 text-xs mt-1">Use the Cost Calculator to add products.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Costumes Inventory</h2>
          <p className="text-sm text-gray-500 mt-0.5">{costings.length} product{costings.length !== 1 ? 's' : ''} · Edit price and status inline, then Save row</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-12"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Prod. Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Net Profit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 w-40">Original Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 w-40">Selling Price</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 w-8">Disc %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-40">Status</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {costings.map(c => {
                const row = editing[c.id]
                const isEditing = !!row
                const isSaving = !!saving[c.id]
                const thumb = getThumb(c.product)

                const dispOriginal = isEditing ? Number(row.originalPrice) || 0 : c.originalPrice
                const dispSelling = isEditing ? Number(row.sellingPrice) || 0 : c.sellingPrice
                const discount = dispOriginal > 0 && dispSelling < dispOriginal
                  ? Math.round(((dispOriginal - dispSelling) / dispOriginal) * 100)
                  : 0

                return (
                  <tr key={c.id} className={isEditing ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}>
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                        {thumb
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                          : <ImageIcon className="w-4 h-4 text-gray-300" />
                        }
                      </div>
                    </td>

                    {/* Product name */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">{c.product?.name ?? '—'}</p>
                      {c.product?.itemCode && <p className="text-xs text-gray-400 mt-0.5">{c.product.itemCode}</p>}
                    </td>

                    {/* Production cost */}
                    <td className="px-4 py-3 text-right text-gray-600 font-mono text-xs">
                      LKR {fmt(c.totalProductionCost)}
                    </td>

                    {/* Net Profit */}
                    <td className={`px-4 py-3 text-right font-mono text-xs font-medium ${c.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      LKR {fmt(c.netProfit)}
                    </td>

                    {/* Original Price (editable) */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={row.originalPrice}
                          onChange={e => setEditing(ed => ({ ...ed, [c.id]: { ...ed[c.id], originalPrice: e.target.value } }))}
                          className="w-full text-right px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          placeholder="0"
                        />
                      ) : (
                        <span className={c.originalPrice > 0 ? 'text-gray-500 line-through text-xs' : 'text-gray-300 text-xs'}>
                          {c.originalPrice > 0 ? `LKR ${fmt(c.originalPrice)}` : '—'}
                        </span>
                      )}
                    </td>

                    {/* Selling Price (editable) */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={row.sellingPrice}
                          onChange={e => setEditing(ed => ({ ...ed, [c.id]: { ...ed[c.id], sellingPrice: e.target.value } }))}
                          className="w-full text-right px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black font-semibold"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900">LKR {fmt(c.sellingPrice)}</span>
                      )}
                    </td>

                    {/* Discount % */}
                    <td className="px-4 py-3 text-center">
                      {discount > 0 ? (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          -{discount}%
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Status (editable dropdown) */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={row.status}
                          onChange={e => setEditing(ed => ({ ...ed, [c.id]: { ...ed[c.id], status: e.target.value } }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUSES.find(s => s.value === c.status)?.label ?? c.status}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveRow(c.id)} disabled={isSaving}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-black text-white text-xs rounded-lg hover:bg-gray-800 disabled:opacity-50">
                              <Check className="w-3 h-3" /> {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => cancelEdit(c.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(c)} title="Edit prices & status"
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => del(c.id)} title="Remove from inventory"
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
