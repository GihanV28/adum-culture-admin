'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { adminFetch } from '@/lib/api'
import { slugify } from '@/lib/utils'
import { Plus, Trash2, Upload, X } from 'lucide-react'

interface Collection { id: string; name: string }
interface Category { id: string; name: string }
interface SizeGuide { id: string; name: string; unit: string; columns: string[]; rows: { size: string; values: string[] }[] }
interface SizeRow { size: string; stock: number }
interface ImageRow { url: string; order: number }

interface FormData {
  name: string; slug: string; itemCode: string; description: string
  price: number; comparePrice: number; costPrice: number
  status: string; featured: boolean; newArrival: boolean; bestSeller: boolean
  stock: number; minStock: number
  categoryId: string; sizeGuideId: string; productNotes: string
  colorHex: string
  modelDetails: string; material: string
  careInstructions: string; styleGuide: string; shippingInfo: string
  images: ImageRow[]; sizes: SizeRow[]; collectionIds: string[]
}

export default function SingleProductForm({ initial, id, collections }: {
  initial?: Partial<FormData>; id?: string; collections: Collection[]
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([])
  const [form, setForm] = useState<FormData>({
    name: '', slug: '', itemCode: '', description: '',
    price: 0, comparePrice: 0, costPrice: 0,
    status: 'published', featured: false, newArrival: false, bestSeller: false,
    stock: 0, minStock: 5,
    categoryId: '', sizeGuideId: '', productNotes: '',
    colorHex: '#000000',
    modelDetails: '', material: '',
    careInstructions: '', styleGuide: '', shippingInfo: '',
    images: [], sizes: [], collectionIds: [],
    ...initial,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [newSize, setNewSize] = useState({ size: '', stock: 0 })
  const [skuLoading, setSkuLoading] = useState(false)

  useEffect(() => {
    adminFetch('/api/categories').then(d => setCategories(d.data.categories)).catch(() => {})
    adminFetch('/api/size-guides').then(d => setSizeGuides(d.data.guides)).catch(() => {})
  }, [])

  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleNameChange = (v: string) => { set('name', v); set('slug', slugify(v)) }

  // Auto-generate SKU when category changes
  const handleCategoryChange = async (catId: string) => {
    set('categoryId', catId)
    if (!catId) { set('itemCode', ''); return }
    setSkuLoading(true)
    try {
      const cat = categories.find(c => c.id === catId)
      const catLetter = cat ? cat.name[0].toUpperCase() : 'X'
      const res = await adminFetch('/api/products/next-sku-number')
      const { padded } = res.data
      set('itemCode', `AC-${catLetter}-S-${padded}`)
    } catch { /* keep existing */ }
    setSkuLoading(false)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const token = localStorage.getItem('admin_token')
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
    const data = await res.json()
    if (data.success) set('images', [...form.images, { url: data.data.url, order: form.images.length }])
    setUploading(false)
  }

  const removeImage = (idx: number) => set('images', form.images.filter((_, i) => i !== idx).map((img, i) => ({ ...img, order: i })))
  const addSize = () => { if (!newSize.size) return; set('sizes', [...form.sizes, { ...newSize }]); setNewSize({ size: '', stock: 0 }) }
  const removeSize = (idx: number) => set('sizes', form.sizes.filter((_, i) => i !== idx))
  const toggleCollection = (cid: string) => set('collectionIds', form.collectionIds.includes(cid) ? form.collectionIds.filter(c => c !== cid) : [...form.collectionIds, cid])

  const save = async () => {
    setSaving(true); setError('')
    try {
      const payload = {
        productType: 'single',
        name: form.name, slug: form.slug,
        itemCode: form.itemCode || undefined,
        description: form.description,
        price: Number(form.price),
        comparePrice: Number(form.comparePrice) || undefined,
        costPrice: Number(form.costPrice) || 0,
        status: form.status,
        featured: form.featured, newArrival: form.newArrival, bestSeller: form.bestSeller,
        stock: Number(form.stock), minStock: Number(form.minStock) || 5,
        categoryId: form.categoryId || undefined,
        sizeGuideId: form.sizeGuideId || undefined,
        productNotes: form.productNotes || undefined,
        modelDetails: form.modelDetails || undefined,
        material: form.material || undefined,
        careInstructions: form.careInstructions ? form.careInstructions.split('\n').filter(Boolean) : [],
        styleGuide: form.styleGuide ? form.styleGuide.split('\n').filter(Boolean) : [],
        shippingInfo: form.shippingInfo ? form.shippingInfo.split('\n').filter(Boolean) : [],
        images: form.images,
        sizes: form.sizes,
        collectionIds: form.collectionIds,
        // Single product color stored as one colorVariant entry (hex only, no sku)
        colorVariants: [{ colorHex: form.colorHex, sku: form.itemCode || null, images: [], sizes: form.sizes }],
      }
      if (id) await adminFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await adminFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) })
      router.push('/products')
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed') }
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Product' : 'New Single Product'}</h1>
          <p className="text-xs text-gray-400 mt-1">One color · One SKU</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/products')} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save Product'}</button>
        </div>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Basic Information</h2>

            {/* Category first — needed to build SKU */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.categoryId} onChange={e => handleCategoryChange(e.target.value)} className={inputCls}>
                <option value="">Select category first</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
              <input value={form.name} onChange={e => handleNameChange(e.target.value)} className={inputCls} placeholder="e.g. Classic White Tee" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Slug *</label>
                <input value={form.slug} onChange={e => set('slug', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  SKU {skuLoading && <span className="text-gray-400">(generating…)</span>}
                </label>
                <input value={form.itemCode} onChange={e => set('itemCode', e.target.value)} className={`${inputCls} font-mono`} placeholder="Select category to auto-generate" />
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.colorHex} onChange={e => set('colorHex', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5" />
                <input value={form.colorHex} onChange={e => set('colorHex', e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black" />
                <span className="text-xs text-gray-400">Shown as color badge on storefront</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                <input value={form.material} onChange={e => set('material', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Model Details</label>
                <input value={form.modelDetails} onChange={e => set('modelDetails', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Pricing & Inventory</h2>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Selling Price (LKR) *</label>
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Original Price (LKR)</label>
                <input type="number" value={form.comparePrice} onChange={e => set('comparePrice', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Cost Price (LKR)</label>
                <input type="number" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Total Stock</label>
                <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Min Stock Alert</label>
                <input type="number" value={form.minStock} onChange={e => set('minStock', e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea value={form.productNotes} onChange={e => set('productNotes', e.target.value)} rows={2} className={inputCls} /></div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Images</h2>
            <div className="flex flex-wrap gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                  <Image src={img.url} alt="" fill className="object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"><X className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-400 disabled:opacity-50">
                {uploading ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <><Upload className="w-4 h-4" /><span className="text-xs">Upload</span></>}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          </div>

          {/* Sizes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Sizes & Stock</h2>
            {form.sizes.length > 0 && (
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Size</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Stock</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="w-10"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {form.sizes.map((s, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2"><input value={s.size} onChange={e => set('sizes', form.sizes.map((r, j) => j === i ? { ...r, size: e.target.value } : r))} className="w-20 px-2 py-1 border border-gray-200 rounded text-sm" /></td>
                      <td className="px-4 py-2"><input type="number" min={0} value={s.stock} onChange={e => set('sizes', form.sizes.map((r, j) => j === i ? { ...r, stock: +e.target.value } : r))} className="w-24 px-2 py-1 border border-gray-200 rounded text-sm" /></td>
                      <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{s.stock > 0 ? 'In Stock' : 'Out of Stock'}</span></td>
                      <td className="px-4 py-2"><button onClick={() => removeSize(i)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex gap-2 items-center">
              <input placeholder="Size" value={newSize.size} onChange={e => setNewSize(n => ({ ...n, size: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSize()} className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="number" placeholder="Stock" value={newSize.stock} onChange={e => setNewSize(n => ({ ...n, stock: +e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSize()} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <button onClick={addSize} className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"><Plus className="w-4 h-4" /> Add</button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Additional Info</h2>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Care Instructions (one per line)</label>
              <textarea value={form.careInstructions} onChange={e => set('careInstructions', e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Style Guide (one per line)</label>
              <textarea value={form.styleGuide} onChange={e => set('styleGuide', e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Shipping & Returns (one per line)</label>
              <textarea value={form.shippingInfo} onChange={e => set('shippingInfo', e.target.value)} rows={3} className={inputCls} /></div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Status</h2>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="active">Active (ORM)</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="space-y-2">
              {[{ key: 'featured', label: 'Featured' }, { key: 'newArrival', label: 'New Arrival' }, { key: 'bestSeller', label: 'Best Seller' }].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof FormData] as boolean} onChange={e => set(key as keyof FormData, e.target.checked)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Size Guide</h2>
            <select value={form.sizeGuideId} onChange={e => set('sizeGuideId', e.target.value)} className={inputCls}>
              <option value="">No size guide</option>
              {sizeGuides.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {form.sizeGuideId && (() => {
              const guide = sizeGuides.find(g => g.id === form.sizeGuideId)
              return guide ? <p className="text-xs text-gray-500">{guide.unit} · {guide.columns.join(', ')}</p> : null
            })()}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Collections</h2>
            {collections.map(c => (
              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.collectionIds.includes(c.id)} onChange={() => toggleCollection(c.id)} className="rounded" />
                {c.name}
              </label>
            ))}
            {collections.length === 0 && <p className="text-xs text-gray-400">No collections yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
