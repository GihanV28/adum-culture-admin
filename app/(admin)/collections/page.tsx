'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { slugify } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

interface Collection { id: string; name: string; slug: string; description?: string; published: boolean; order: number; _count: { products: number } }

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [form, setForm] = useState({ name: '', slug: '', description: '', published: true })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Collection>>({})
  const [saving, setSaving] = useState(false)

  const load = () => adminFetch('/api/collections').then(d => setCollections(d.data.collections)).catch(console.error)
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name) return
    setSaving(true)
    await adminFetch('/api/collections', { method: 'POST', body: JSON.stringify(form) })
    setForm({ name: '', slug: '', description: '', published: true })
    load(); setSaving(false)
  }

  const save = async (id: string) => {
    await adminFetch(`/api/collections/${id}`, { method: 'PUT', body: JSON.stringify(editForm) })
    setEditId(null); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this collection?')) return
    await adminFetch(`/api/collections/${id}`, { method: 'DELETE' })
    load()
  }

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Collections</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-900">New Collection</h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} className={inputCls} />
          <input placeholder="Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputCls} />
        </div>
        <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputCls} w-full`} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} /> Published
          </label>
          <button onClick={create} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add Collection
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {collections.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No collections yet.</div>
        ) : collections.map(c => (
          <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-0">
            {editId === c.id ? (
              <>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                  <input value={editForm.slug ?? ''} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))} className={inputCls} />
                </div>
                <button onClick={() => save(c.id)} className="p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditId(null)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.slug} · {c._count.products} products</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.published ? 'Published' : 'Hidden'}</span>
                <button onClick={() => { setEditId(c.id); setEditForm({ name: c.name, slug: c.slug }) }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => del(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
