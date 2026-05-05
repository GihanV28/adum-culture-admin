'use client'
import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Check, ImageIcon } from 'lucide-react'
import { getFabrics, addFabric, updateFabric, deleteFabric, type Fabric } from '@/lib/costcal-storage'

const UNITS = ['Yards', 'KG', 'Pieces', 'Rolls'] as const

const emptyForm = { name: '', cost: '', quantity: '', unit: 'Yards' as Fabric['unit'], image: '' }

export default function FabricDirectory() {
  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => setFabrics(await getFabrics())
  useEffect(() => { load() }, [])

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, image: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true) }
  const openEdit = (f: Fabric) => { setForm({ name: f.name, cost: String(f.cost), quantity: String(f.quantity ?? ''), unit: f.unit ?? 'Yards', image: f.image ?? '' }); setEditId(f.id); setShowForm(true) }
  const cancel = () => { setShowForm(false); setEditId(null); setForm(emptyForm) }

  const save = async () => {
    if (!form.name || !form.cost) return
    setSaving(true)
    const data = { name: form.name, cost: Number(form.cost), quantity: form.quantity ? Number(form.quantity) : undefined, unit: form.unit, image: form.image || undefined }
    if (editId) await updateFabric(editId, data)
    else await addFabric(data)
    await load(); cancel(); setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('Delete this fabric?')) return
    await deleteFabric(id); load()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Fabric Directory</h2>
          <p className="text-sm text-gray-500 mt-0.5">{fabrics.length} fabric{fabrics.length !== 1 ? 's' : ''} in inventory</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> Add Fabric
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{editId ? 'Edit Fabric' : 'New Fabric'}</h3>
            <button onClick={cancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Fabric Name / SKU *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Cotton Twill #4" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Cost (LKR) *</label>
              <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <div className="flex gap-2">
                <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls} placeholder="0" />
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value as Fabric['unit'] }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Sample Image (optional)</label>
              <div className="flex items-center gap-3">
                {form.image ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.image} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, image: '' }))} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <button onClick={() => fileRef.current?.click()} className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">Choose image</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={cancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={!form.name || !form.cost || saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40">
              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Fabric'}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {fabrics.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400 text-sm">No fabrics yet. Add your first fabric to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {fabrics.map(f => (
            <div key={f.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                {f.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.image} alt={f.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-gray-900 truncate">{f.name}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">LKR {f.cost.toLocaleString()}</p>
                {f.quantity && <p className="text-xs text-gray-400 mt-0.5">{f.quantity} {f.unit}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(f)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => del(f.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
