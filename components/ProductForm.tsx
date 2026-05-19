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
interface ColorVariant { colorHex: string; colorName: string; sizes: SizeRow[] }
interface ProductData {
  name: string; slug: string; itemCode: string; barcode: string
  description: string; price: number; comparePrice: number; costPrice: number
  status: string; featured: boolean; newArrival: boolean; bestSeller: boolean
  stock: number; minStock: number; unit: string
  categoryId: string; sizeGuideId: string; productNotes: string
  colors: string; modelDetails: string; material: string
  careInstructions: string; styleGuide: string; shippingInfo: string
  images: ImageRow[]; sizes: SizeRow[]; collectionIds: string[]
  colorVariants?: ColorVariant[]
}

export default function ProductForm({ initial, id, collections }: { initial?: Partial<ProductData>; id?: string; collections: Collection[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([])
  const [form, setForm] = useState<ProductData>({
    name: '', slug: '', itemCode: '', barcode: '', description: '',
    price: 0, comparePrice: 0, costPrice: 0,
    status: 'draft', featured: false, newArrival: false, bestSeller: false,
    stock: 0, minStock: 5, unit: '',
    categoryId: '', sizeGuideId: '', productNotes: '',
    colors: '', modelDetails: '', material: '',
    careInstructions: '', styleGuide: '', shippingInfo: '',
    images: [], sizes: [], collectionIds: [],
    ...initial,
  })
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>(
    (initial as { colorVariants?: ColorVariant[] })?.colorVariants ?? []
  )
  const [newVariantSizes, setNewVariantSizes] = useState<SizeRow[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // keep newVariantSizes length in sync with colorVariants
  useEffect(() => {
    setNewVariantSizes(prev => {
      const next = [...prev]
      while (next.length < colorVariants.length) next.push({ size: '', stock: 0 })
      return next.slice(0, colorVariants.length)
    })
  }, [colorVariants.length])

  useEffect(() => {
    adminFetch('/api/categories').then(d => setCategories(d.data.categories)).catch(() => {})
    adminFetch('/api/size-guides').then(d => setSizeGuides(d.data.guides)).catch(() => {})
  }, [])

  const set = (k: keyof ProductData, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const handleNameChange = (v: string) => { set('name', v); set('slug', slugify(v)) }

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
  const toggleCollection = (cid: string) => set('collectionIds', form.collectionIds.includes(cid) ? form.collectionIds.filter(c => c !== cid) : [...form.collectionIds, cid])

  // ── Color variant helpers ──────────────────────────────────────────────────
  const addVariant = () => setColorVariants(cv => [...cv, { colorHex: '#000000', colorName: '', sizes: [] }])
  const removeVariant = (vi: number) => setColorVariants(cv => cv.filter((_, i) => i !== vi))
  const updateVariant = (vi: number, patch: Partial<ColorVariant>) =>
    setColorVariants(cv => cv.map((v, i) => i === vi ? { ...v, ...patch } : v))
  const inheritSizes = (vi: number) => {
    if (vi === 0) return
    const prev = colorVariants[vi - 1]
    updateVariant(vi, { sizes: prev.sizes.map(s => ({ ...s })) })
  }
  const addSizeToVariant = (vi: number) => {
    const ns = newVariantSizes[vi]
    if (!ns?.size) return
    updateVariant(vi, { sizes: [...colorVariants[vi].sizes, { size: ns.size, stock: ns.stock }] })
    setNewVariantSizes(prev => prev.map((s, i) => i === vi ? { size: '', stock: 0 } : s))
  }
  const removeSizeFromVariant = (vi: number, si: number) =>
    updateVariant(vi, { sizes: colorVariants[vi].sizes.filter((_, i) => i !== si) })
  const updateVariantSize = (vi: number, si: number, patch: Partial<SizeRow>) =>
    updateVariant(vi, { sizes: colorVariants[vi].sizes.map((s, i) => i === si ? { ...s, ...patch } : s) })

  const save = async () => {
    setSaving(true); setError('')
    try {
      // Aggregate sizes from all color variants for backward compat
      const aggregatedSizes: Record<string, number> = {}
      colorVariants.forEach(cv => cv.sizes.forEach(s => {
        aggregatedSizes[s.size] = (aggregatedSizes[s.size] ?? 0) + s.stock
      }))
      const sizes = colorVariants.length > 0
        ? Object.entries(aggregatedSizes).map(([size, stock]) => ({ size, stock }))
        : form.sizes

      const payload = {
        ...form,
        price: Number(form.price),
        comparePrice: Number(form.comparePrice) || undefined,
        costPrice: Number(form.costPrice) || 0,
        stock: Number(form.stock),
        minStock: Number(form.minStock) || 5,
        categoryId: form.categoryId || undefined,
        sizeGuideId: form.sizeGuideId || undefined,
        colors: colorVariants.length > 0
          ? colorVariants.map(cv => cv.colorName || cv.colorHex).filter(Boolean)
          : form.colors ? form.colors.split(',').map(c => c.trim()).filter(Boolean) : [],
        careInstructions: form.careInstructions ? form.careInstructions.split('\n').filter(Boolean) : [],
        styleGuide: form.styleGuide ? form.styleGuide.split('\n').filter(Boolean) : [],
        shippingInfo: form.shippingInfo ? form.shippingInfo.split('\n').filter(Boolean) : [],
        sizes,
        colorVariants,
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
        <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Product' : 'New Product'}</h1>
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
              <input value={form.name} onChange={e => handleNameChange(e.target.value)} className={inputCls} placeholder="e.g. Classic White Tee" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Slug *</label>
                <input value={form.slug} onChange={e => set('slug', e.target.value)} className={inputCls} placeholder="classic-white-tee" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">SKU / Item Code</label>
                <input value={form.itemCode} onChange={e => set('itemCode', e.target.value)} className={inputCls} placeholder="AC-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Barcode</label>
                <input value={form.barcode} onChange={e => set('barcode', e.target.value)} className={inputCls} placeholder="e.g. 8941234567890" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                <input value={form.unit} onChange={e => set('unit', e.target.value)} className={inputCls} placeholder="piece / kg / set" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls} placeholder="Product description…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                <input value={form.material} onChange={e => set('material', e.target.value)} className={inputCls} placeholder="e.g. 100% Cotton" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Model Details</label>
                <input value={form.modelDetails} onChange={e => set('modelDetails', e.target.value)} className={inputCls} placeholder="Model is 5'9, wearing M" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Colors (comma-separated)</label>
              <input value={form.colors} onChange={e => set('colors', e.target.value)} className={inputCls} placeholder="Black, White, Navy" />
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Pricing & Inventory</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price (LKR) *</label>
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Original Price (LKR)</label>
                <input type="number" value={form.comparePrice} onChange={e => set('comparePrice', e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price (LKR)</label>
                <input type="number" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Total Stock</label>
                <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Stock Alert</label>
                <input type="number" value={form.minStock} onChange={e => set('minStock', e.target.value)} className={inputCls} placeholder="5" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Internal Notes (ORM only)</label>
              <textarea value={form.productNotes} onChange={e => set('productNotes', e.target.value)} rows={2} className={inputCls} placeholder="Batch number, supplier notes…" />
            </div>
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

          {/* Sizes, Colors & Stock */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Sizes, Colors & Stock</h2>
              <button onClick={addVariant}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800">
                <Plus className="w-3 h-3" /> Add Color
              </button>
            </div>

            {colorVariants.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                No colors added yet. Click <strong>Add Color</strong> to define size availability per color.
              </div>
            )}

            {colorVariants.map((variant, vi) => (
              <div key={vi} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Color header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <input type="color" value={variant.colorHex}
                    onChange={e => updateVariant(vi, { colorHex: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5 bg-white" />
                  <input value={variant.colorHex}
                    onChange={e => updateVariant(vi, { colorHex: e.target.value })}
                    className="w-24 px-2 py-1 border border-gray-200 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black" placeholder="#000000" />
                  <input value={variant.colorName}
                    onChange={e => updateVariant(vi, { colorName: e.target.value })}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black" placeholder="Color name (e.g. Black)" />
                  {vi === 0 && form.sizeGuideId && (() => {
                    const guide = sizeGuides.find(g => g.id === form.sizeGuideId)
                    if (!guide) return null
                    const missing = (guide.rows as { size: string }[])
                      .map(r => r.size)
                      .filter(s => !variant.sizes.find(vs => vs.size === s))
                    if (missing.length === 0) return null
                    return (
                      <button onClick={() => updateVariant(0, { sizes: [...variant.sizes, ...missing.map(s => ({ size: s, stock: 0 }))] })}
                        className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                        ↓ Import Sizes
                      </button>
                    )
                  })()}
                  {vi > 0 && (
                    <button onClick={() => inheritSizes(vi)}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                      ↑ Add Above Sizes
                    </button>
                  )}
                  <button onClick={() => removeVariant(vi)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sizes table for this color */}
                <div className="p-4 space-y-3">
                  {variant.sizes.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-2 text-left text-xs font-medium text-gray-500 w-28">Size</th>
                          <th className="pb-2 text-left text-xs font-medium text-gray-500 w-28">Stock Qty</th>
                          <th className="pb-2 text-left text-xs font-medium text-gray-500">Status</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {variant.sizes.map((s, si) => (
                          <tr key={si}>
                            <td className="py-1.5 pr-2">
                              <input value={s.size}
                                onChange={e => updateVariantSize(vi, si, { size: e.target.value })}
                                className="w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black font-medium" />
                            </td>
                            <td className="py-1.5 pr-2">
                              <input type="number" min={0} value={s.stock}
                                onChange={e => updateVariantSize(vi, si, { stock: +e.target.value })}
                                className="w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                            </td>
                            <td className="py-1.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {s.stock > 0 ? 'In Stock' : 'Out of Stock'}
                              </span>
                            </td>
                            <td className="py-1.5">
                              <button onClick={() => removeSizeFromVariant(vi, si)} className="text-gray-300 hover:text-red-500">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Add size to this variant */}
                  <div className="flex gap-2 items-center pt-1">
                    <input placeholder="Size (e.g. M)"
                      value={newVariantSizes[vi]?.size ?? ''}
                      onChange={e => setNewVariantSizes(prev => prev.map((s, i) => i === vi ? { ...s, size: e.target.value } : s))}
                      onKeyDown={e => e.key === 'Enter' && addSizeToVariant(vi)}
                      className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                    <input type="number" placeholder="Stock"
                      value={newVariantSizes[vi]?.stock ?? 0}
                      onChange={e => setNewVariantSizes(prev => prev.map((s, i) => i === vi ? { ...s, stock: +e.target.value } : s))}
                      onKeyDown={e => e.key === 'Enter' && addSizeToVariant(vi)}
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                    <button onClick={() => addSizeToVariant(vi)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">
                      <Plus className="w-3.5 h-3.5" /> Add size
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Additional Info</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Care Instructions (one per line)</label>
              <textarea value={form.careInstructions} onChange={e => set('careInstructions', e.target.value)} rows={3} className={inputCls} placeholder="Machine wash cold&#10;Do not bleach&#10;Tumble dry low" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Style Guide (one per line)</label>
              <textarea value={form.styleGuide} onChange={e => set('styleGuide', e.target.value)} rows={3} className={inputCls} placeholder="Pair with chino trousers&#10;Works well with sneakers" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Shipping & Returns (one per line)</label>
              <textarea value={form.shippingInfo} onChange={e => set('shippingInfo', e.target.value)} rows={3} className={inputCls} placeholder="Free delivery on orders over LKR 5000&#10;Returns accepted within 14 days" />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Status</h2>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="active">Active (ORM)</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <div className="space-y-2">
              {[{ key: 'featured', label: 'Featured' }, { key: 'newArrival', label: 'New Arrival' }, { key: 'bestSeller', label: 'Best Seller' }].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof ProductData] as boolean} onChange={e => set(key as keyof ProductData, e.target.checked)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Category</h2>
            <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={inputCls}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="text-xs text-gray-400">Used for ORM inventory grouping</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Size Guide</h2>
            <select value={form.sizeGuideId} onChange={e => set('sizeGuideId', e.target.value)} className={inputCls}>
              <option value="">No size guide</option>
              {sizeGuides.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {form.sizeGuideId && (() => {
              const guide = sizeGuides.find(g => g.id === form.sizeGuideId)
              return guide ? (
                <p className="text-xs text-gray-500">{guide.unit} · {guide.columns.join(', ')} · {guide.rows.length} sizes</p>
              ) : null
            })()}
            {sizeGuides.length === 0 && <p className="text-xs text-gray-400">No size guides yet. <a href="/size-guides" className="text-blue-600 hover:underline">Add one</a></p>}
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
