'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { getCached, setCached, invalidateCache } from '@/lib/admin-cache'
import { Plus, Edit, Trash2, Tag } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface Category { id: string; name: string; skuPrefix?: string | null; description?: string; _count?: { products: number } }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', skuPrefix: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    const cached = getCached<Category[]>('categories')
    if (cached) { setCategories(cached); setLoading(false); return }
    setLoading(true)
    adminFetch('/api/categories').then(d => { const v = d.data.categories; setCategories(v); setCached('categories', v); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const openNew = () => { setEditing(null); setForm({ name: '', skuPrefix: '', description: '' }); setShowForm(true); setError('') }
  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, skuPrefix: c.skuPrefix ?? '', description: c.description || '' })
    setShowForm(true); setError('')
  }

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required')
    if (!form.skuPrefix.trim()) return setError('SKU Prefix is required')
    setSaving(true); setError('')
    try {
      if (editing) await adminFetch(`/api/categories/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) })
      else await adminFetch('/api/categories', { method: 'POST', body: JSON.stringify(form) })
      setShowForm(false); invalidateCache('categories'); load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save') }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this category? Products in this category will be uncategorized.')) return
    await adminFetch(`/api/categories/${id}`, { method: 'DELETE' })
    invalidateCache('categories'); load()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Organize products for the ORM inventory system</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Category</span><span className="sm:hidden">New</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit Category' : 'New Category'}</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. Frocks"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  SKU Prefix *
                  <span className="ml-1 font-normal text-gray-400">(e.g. F → AC-F-S-0001)</span>
                </label>
                <input
                  value={form.skuPrefix}
                  onChange={e => setForm(f => ({ ...f, skuPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) }))}
                  className={inputCls}
                  placeholder="e.g. F"
                  maxLength={5}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className={inputCls}
                placeholder="Optional description"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Category'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {loading ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-0">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No categories yet. Create one to start organizing your inventory.</div>
        ) : categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-gray-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{cat.name}</p>
                  {cat.skuPrefix ? (
                    <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded tracking-widest shrink-0">
                      AC-{cat.skuPrefix}-…
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded shrink-0">
                      No SKU prefix
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {cat._count?.products ?? 0} products
                  {cat.description ? ` · ${cat.description}` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => remove(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
