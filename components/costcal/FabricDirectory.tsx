'use client'
import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Check, ImageIcon, Package, User, Phone, CalendarDays, Shirt } from 'lucide-react'
import { getFabrics, addFabric, updateFabric, deleteFabric, type Fabric } from '@/lib/costcal-storage'

const UNITS = ['Yards', 'KG', 'Pieces', 'Rolls'] as const
const MAX_IMAGES = 3

const today = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  name: '',
  buyingDate: today(),
  supplierName: '',
  supplierMobile: '',
  description: '',
  costPerUnit: '',
  quantity: '',
  unit: 'Yards' as Fabric['unit'],
  estimatedPieces: '',
  images: [] as string[],
}

type FormState = typeof emptyForm

function computeTotal(costPerUnit: string, quantity: string) {
  const c = parseFloat(costPerUnit)
  const q = parseFloat(quantity)
  if (isNaN(c)) return null
  if (isNaN(q) || q === 0) return c
  return c * q
}

export default function FabricDirectory() {
  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [pendingSlot, setPendingSlot] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => setFabrics(await getFabrics())
  useEffect(() => { load() }, [])

  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }))

  const openImagePicker = (slot: number) => {
    setPendingSlot(slot)
    if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click() }
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setForm(f => {
        const imgs = [...f.images]
        imgs[pendingSlot] = ev.target?.result as string
        return { ...f, images: imgs }
      })
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (i: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))
  }

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true) }

  const openEdit = (f: Fabric) => {
    setForm({
      name: f.name,
      buyingDate: f.buyingDate ?? '',
      supplierName: f.supplierName ?? '',
      supplierMobile: f.supplierMobile ?? '',
      description: f.description ?? '',
      costPerUnit: String(f.costPerUnit ?? ''),
      quantity: String(f.quantity ?? ''),
      unit: f.unit ?? 'Yards',
      estimatedPieces: String(f.estimatedPieces ?? ''),
      images: f.images ?? [],
    })
    setEditId(f.id)
    setShowForm(true)
  }

  const cancel = () => { setShowForm(false); setEditId(null); setForm(emptyForm) }

  const save = async () => {
    if (!form.name || !form.costPerUnit || !form.supplierName) return
    setSaving(true)
    const costPerUnit = parseFloat(form.costPerUnit)
    const quantity = form.quantity ? parseFloat(form.quantity) : undefined
    const totalCost = quantity ? costPerUnit * quantity : costPerUnit
    const data: Omit<Fabric, 'id' | 'createdAt'> = {
      name: form.name,
      buyingDate: form.buyingDate,
      supplierName: form.supplierName,
      supplierMobile: form.supplierMobile || undefined,
      description: form.description || undefined,
      costPerUnit,
      quantity,
      unit: form.unit,
      estimatedPieces: form.estimatedPieces ? parseFloat(form.estimatedPieces) : undefined,
      totalCost,
      images: form.images.length > 0 ? form.images : undefined,
    }
    if (editId) await updateFabric(editId, data)
    else await addFabric(data)
    await load(); cancel(); setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('Delete this fabric?')) return
    await deleteFabric(id); load()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

  const total = computeTotal(form.costPerUnit, form.quantity)

  const formatDate = (d: string) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

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
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">{editId ? 'Edit Fabric' : 'New Fabric'}</h3>
            <button onClick={cancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4">
            {/* Fabric Name */}
            <div>
              <label className={labelCls}>Fabric Name / SKU *</label>
              <input value={form.name} onChange={e => set({ name: e.target.value })} className={inputCls} placeholder="e.g. Cotton Twill #4" />
            </div>

            {/* Buying Date */}
            <div>
              <label className={labelCls}>Buying Date *</label>
              <input type="date" value={form.buyingDate} onChange={e => set({ buyingDate: e.target.value })} className={inputCls} />
            </div>

            {/* Supplier Name + Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Supplier Name *</label>
                <input value={form.supplierName} onChange={e => set({ supplierName: e.target.value })} className={inputCls} placeholder="e.g. Textile Plus" />
              </div>
              <div>
                <label className={labelCls}>Supplier Mobile <span className="font-normal text-gray-400">(optional)</span></label>
                <input type="tel" value={form.supplierMobile} onChange={e => set({ supplierMobile: e.target.value })} className={inputCls} placeholder="+94 77 000 0000" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Description <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea value={form.description} onChange={e => set({ description: e.target.value })} rows={2} className={inputCls} placeholder="Fabric details, color, weave type…" />
            </div>

            {/* Cost per unit + Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Cost per Unit (LKR) *</label>
                <input type="number" min={0} value={form.costPerUnit} onChange={e => set({ costPerUnit: e.target.value })} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Quantity *</label>
                <div className="flex gap-2">
                  <input type="number" min={0} value={form.quantity} onChange={e => set({ quantity: e.target.value })} className={inputCls} placeholder="0" />
                  <select value={form.unit} onChange={e => set({ unit: e.target.value as Fabric['unit'] })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black shrink-0">
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Auto-calculated total */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Total Cost (auto)</span>
              <span className="text-lg font-bold text-gray-900">
                {total !== null ? `LKR ${total.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </span>
            </div>

            {/* Estimated Pieces */}
            <div>
              <label className={labelCls}>Estimated Pieces Count <span className="font-normal text-gray-400">(forecasted finished garments)</span></label>
              <input type="number" min={0} value={form.estimatedPieces} onChange={e => set({ estimatedPieces: e.target.value })} className={inputCls} placeholder="e.g. 25" />
            </div>

            {/* Images — up to 3 */}
            <div>
              <label className={labelCls}>
                Sample Images <span className="font-normal text-gray-400">(optional, up to {MAX_IMAGES})</span>
              </label>
              <div className="flex gap-3 flex-wrap">
                {Array.from({ length: MAX_IMAGES }).map((_, i) => {
                  const src = form.images[i]
                  const isNextSlot = !src && form.images.length === i

                  if (src) {
                    return (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }

                  if (isNextSlot) {
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openImagePicker(i)}
                        className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-400 hover:bg-gray-50 shrink-0 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px]">Add</span>
                      </button>
                    )
                  }

                  return (
                    <div key={i} className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )
                })}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              {form.images.length > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">{form.images.length} of {MAX_IMAGES} images added</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100 justify-end">
            <button onClick={cancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button
              onClick={save}
              disabled={!form.name || !form.costPerUnit || !form.supplierName || saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"
            >
              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Fabric'}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {fabrics.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400 text-sm">
          No fabrics yet. Add your first fabric to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {fabrics.map(f => {
            const displayTotal = f.totalCost ?? (f.costPerUnit ?? (f as {cost?: number}).cost ?? 0)
            const costPerUnit = f.costPerUnit ?? (f as {cost?: number}).cost
            const thumbUrl = f.images?.[0]
            const extraCount = (f.images?.length ?? 0) - 1
            return (
              <div key={f.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Thumbnail */}
                <div className="relative h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                  {extraCount > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      +{extraCount} photo{extraCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <p className="font-semibold text-gray-900 truncate">{f.name}</p>

                  {f.buyingDate && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CalendarDays className="w-3 h-3 shrink-0" />
                      {formatDate(f.buyingDate)}
                    </div>
                  )}

                  {f.supplierName && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                      <User className="w-3 h-3 shrink-0" />
                      {f.supplierName}
                      {f.supplierMobile && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{f.supplierMobile}</span>}
                    </div>
                  )}

                  {f.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">{f.description}</p>
                  )}

                  <div className="pt-1 border-t border-gray-100 space-y-1">
                    {costPerUnit !== undefined && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Per unit</span>
                        <span className="font-medium">LKR {costPerUnit.toLocaleString()}</span>
                      </div>
                    )}
                    {f.quantity && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Qty</span>
                        <span>{f.quantity} {f.unit}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Total</span>
                      <span className="text-base font-bold text-gray-900">LKR {displayTotal.toLocaleString()}</span>
                    </div>
                    {f.estimatedPieces && (
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Shirt className="w-3 h-3" /> Est. pieces</span>
                        <span className="font-medium text-gray-700">{f.estimatedPieces}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => openEdit(f)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => del(f.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
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
