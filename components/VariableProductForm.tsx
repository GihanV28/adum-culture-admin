'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { adminFetch } from '@/lib/api'
import { slugify } from '@/lib/utils'
import { Plus, Trash2, Upload, X, Download, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableVariantImage({ img, onRemove }: { img: { url: string; order: number }; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.url })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group cursor-grab active:cursor-grabbing"
      {...attributes} {...listeners}
    >
      <Image src={img.url} alt="" fill className="object-cover pointer-events-none select-none" />
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onRemove}
        className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center z-10"
      >
        <X className="w-2.5 h-2.5" />
      </button>
      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <GripVertical className="w-3.5 h-3.5 text-white drop-shadow-sm" />
      </div>
    </div>
  )
}

interface Collection { id: string; name: string }
interface Category { id: string; name: string; skuPrefix?: string | null }
interface SizeGuide { id: string; name: string; unit: string; columns: string[]; rows: { size: string; values: string[] }[] }
interface SizeRow { size: string; stock: number }
interface ColorVariant {
  colorHex: string
  sku: string
  skuLoading?: boolean
  images: { url: string; order: number }[]
  sizes: SizeRow[]
}

interface FormData {
  name: string; slug: string; description: string
  price: number; comparePrice: number; costPrice: number
  status: string; featured: boolean; newArrival: boolean; bestSeller: boolean
  minStock: number; categoryId: string; sizeGuideId: string; productNotes: string
  modelDetails: string; material: string
  careInstructions: string; styleGuide: string; shippingInfo: string
  collectionIds: string[]
}

export default function VariableProductForm({ initial, id, collections, initialVariants }: {
  initial?: Partial<FormData>
  initialVariants?: ColorVariant[]
  id?: string
  collections: Collection[]
}) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([])
  const [form, setForm] = useState<FormData>({
    name: '', slug: '', description: '',
    price: 0, comparePrice: 0, costPrice: 0,
    status: 'published', featured: false, newArrival: false, bestSeller: false,
    minStock: 5, categoryId: '', sizeGuideId: '', productNotes: '',
    modelDetails: '', material: '',
    careInstructions: '', styleGuide: '', shippingInfo: '',
    collectionIds: [],
    ...initial,
  })
  const [variants, setVariants] = useState<ColorVariant[]>(initialVariants ?? [])
  const [newSizes, setNewSizes] = useState<{ size: string; stock: number }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingVariants, setUploadingVariants] = useState<Set<number>>(new Set())
  const [draggingVariant, setDraggingVariant] = useState<number | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const handleVariantImageDragEnd = (vi: number) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setVariants(prev => prev.map((v, i) => {
      if (i !== vi) return v
      const oldIdx = v.images.findIndex(img => img.url === active.id)
      const newIdx = v.images.findIndex(img => img.url === over.id)
      return { ...v, images: arrayMove(v.images, oldIdx, newIdx).map((img, idx) => ({ ...img, order: idx })) }
    }))
  }

  useEffect(() => {
    adminFetch('/api/categories').then(d => setCategories(d.data.categories)).catch(() => {})
    adminFetch('/api/size-guides').then(d => setSizeGuides(d.data.guides)).catch(() => {})
  }, [])

  useEffect(() => {
    setNewSizes(prev => {
      const next = [...prev]
      while (next.length < variants.length) next.push({ size: '', stock: 0 })
      return next.slice(0, variants.length)
    })
  }, [variants.length])

  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const handleNameChange = (v: string) => { set('name', v); set('slug', slugify(v)) }

  const buildSku = async (catLetter: string, colorHex: string): Promise<string> => {
    const colorLetter = colorHex.length >= 1
      ? String.fromCharCode(65 + (parseInt(colorHex.slice(1, 3) || '0', 16) % 26))
      : 'X'
    const res = await adminFetch('/api/products/next-sku-number')
    return `AC-${catLetter}-${colorLetter}-${res.data.padded}`
  }

  const getCatPrefix = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    return cat?.skuPrefix || cat?.name[0].toUpperCase() || 'X'
  }

  const handleCategoryChange = async (catId: string) => {
    set('categoryId', catId)
    if (!catId || variants.length === 0) return
    const catPrefix = getCatPrefix(catId)
    const updated = await Promise.all(variants.map(async (v) => ({ ...v, sku: await buildSku(catPrefix, v.colorHex) })))
    setVariants(updated)
  }

  const addVariant = async () => {
    const catPrefix = getCatPrefix(form.categoryId)
    const newVariant: ColorVariant = { colorHex: '#000000', sku: '', skuLoading: true, images: [], sizes: [] }
    setVariants(prev => [...prev, newVariant])
    try {
      const sku = await buildSku(catPrefix, '#000000')
      setVariants(prev => prev.map((v, i) => i === prev.length - 1 ? { ...v, sku, skuLoading: false } : v))
    } catch {
      setVariants(prev => prev.map((v, i) => i === prev.length - 1 ? { ...v, skuLoading: false } : v))
    }
  }

  const updateVariant = (vi: number, patch: Partial<ColorVariant>) =>
    setVariants(prev => prev.map((v, i) => i === vi ? { ...v, ...patch } : v))

  const handleColorChange = async (vi: number, hex: string) => {
    updateVariant(vi, { colorHex: hex, skuLoading: true })
    const catPrefix = getCatPrefix(form.categoryId)
    try {
      const sku = await buildSku(catPrefix, hex)
      setVariants(prev => prev.map((v, i) => i === vi ? { ...v, colorHex: hex, sku, skuLoading: false } : v))
    } catch {
      setVariants(prev => prev.map((v, i) => i === vi ? { ...v, colorHex: hex, skuLoading: false } : v))
    }
  }

  const removeVariant = (vi: number) => setVariants(prev => prev.filter((_, i) => i !== vi))

  const uploadImagesForVariant = async (vi: number, files: File[]) => {
    if (!files.length) return
    setUploadingVariants(prev => new Set(prev).add(vi))
    const token = localStorage.getItem('admin_token')
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const fd = new FormData(); fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
        const data = await res.json()
        if (!data.success) throw new Error(data.message || 'Upload failed')
        return data.data.url as string
      })
    )
    const urls = results.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled').map(r => r.value)
    setVariants(prev => prev.map((v, i) => {
      if (i !== vi) return v
      return { ...v, images: [...v.images, ...urls.map((url, idx) => ({ url, order: v.images.length + idx }))] }
    }))
    setUploadingVariants(prev => { const s = new Set(prev); s.delete(vi); return s })
  }

  const removeImageFromVariant = (vi: number, imgIdx: number) => {
    const v = variants[vi]
    updateVariant(vi, { images: v.images.filter((_, i) => i !== imgIdx).map((img, i) => ({ ...img, order: i })) })
  }

  const addSizeToVariant = (vi: number) => {
    const ns = newSizes[vi]
    if (!ns?.size.trim()) return
    const v = variants[vi]
    updateVariant(vi, { sizes: [...v.sizes, { size: ns.size, stock: ns.stock }] })
    setNewSizes(prev => prev.map((s, i) => i === vi ? { size: '', stock: 0 } : s))
  }

  const importSizesToVariant = (vi: number, guide: SizeGuide) => {
    updateVariant(vi, { sizes: guide.rows.map(r => ({ size: r.size, stock: 0 })) })
  }

  const importSizesToAll = (guide: SizeGuide) => {
    const imported = guide.rows.map(r => ({ size: r.size, stock: 0 }))
    setVariants(prev => prev.map(v => ({ ...v, sizes: imported })))
  }

  const toggleCollection = (cid: string) => set('collectionIds', form.collectionIds.includes(cid) ? form.collectionIds.filter(c => c !== cid) : [...form.collectionIds, cid])

  const save = async () => {
    setError('')
    if (!form.name.trim()) { setError('Product name is required.'); return }
    if (!form.slug.trim()) { setError('Slug is required.'); return }
    if (!form.categoryId) { setError('Please select a category.'); return }
    if (variants.length === 0) { setError('Add at least one color variant.'); return }
    setSaving(true)
    try {
      const payload = {
        productType: 'variable',
        name: form.name, slug: form.slug,
        description: form.description,
        price: Number(form.price),
        comparePrice: Number(form.comparePrice) || undefined,
        costPrice: Number(form.costPrice) || 0,
        status: form.status,
        featured: form.featured, newArrival: form.newArrival, bestSeller: form.bestSeller,
        stock: 0, minStock: Number(form.minStock) || 5,
        categoryId: form.categoryId || undefined,
        sizeGuideId: form.sizeGuideId || undefined,
        productNotes: form.productNotes || undefined,
        modelDetails: form.modelDetails || undefined,
        material: form.material || undefined,
        careInstructions: form.careInstructions ? form.careInstructions.split('\n').filter(Boolean) : [],
        styleGuide: form.styleGuide ? form.styleGuide.split('\n').filter(Boolean) : [],
        shippingInfo: form.shippingInfo ? form.shippingInfo.split('\n').filter(Boolean) : [],
        images: [], sizes: [],
        collectionIds: form.collectionIds,
        colorVariants: variants.map(v => ({ colorHex: v.colorHex, sku: v.sku, images: v.images, sizes: v.sizes })),
      }
      if (id) await adminFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await adminFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) })
      router.push('/products')
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed. Please try again.') }
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'
  const selectedGuide = sizeGuides.find(g => g.id === form.sizeGuideId)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Product' : 'New Variable Product'}</h1>
          <p className="text-xs text-gray-400 mt-1">Multiple colors · SKU per color</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/products')} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save Product'}</button>
        </div>
      </div>
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Category FIRST */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Category <span className="text-red-500">*</span> <span className="text-xs font-normal text-gray-400">— required first to generate SKUs</span></h2>
            <select value={form.categoryId} onChange={e => handleCategoryChange(e.target.value)} className={inputCls}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Basic Information</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => handleNameChange(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
              <input value={form.slug} onChange={e => set('slug', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                <input value={form.material} onChange={e => set('material', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Model Details</label>
                <input value={form.modelDetails} onChange={e => set('modelDetails', e.target.value)} className={inputCls} /></div>
            </div>
          </div>

          {/* Color Variants */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Color Variants</h2>
              <button onClick={addVariant} disabled={!form.categoryId}
                className="flex items-center gap-1.5 text-sm px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40">
                <Plus className="w-4 h-4" /> Add Color
              </button>
            </div>
            {!form.categoryId && <p className="text-xs text-amber-600">Select a category first to generate SKUs.</p>}
            {variants.length === 0 && form.categoryId && (
              <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                Click <strong>Add Color</strong> to add the first color variant.
              </div>
            )}

            {variants.map((variant, vi) => {
              const isUploading = uploadingVariants.has(vi)
              const isDraggingThis = draggingVariant === vi
              return (
                <div key={vi} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Color header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <input type="color" value={variant.colorHex} onChange={e => handleColorChange(vi, e.target.value)}
                      className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white" />
                    <input value={variant.colorHex} onChange={e => handleColorChange(vi, e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-200 rounded text-xs font-mono focus:outline-none" />
                    <div className="flex-1">
                      <span className="text-xs text-gray-400">SKU: </span>
                      <span className="text-xs font-mono font-semibold text-gray-700">
                        {variant.skuLoading ? 'generating…' : (variant.sku || '—')}
                      </span>
                    </div>
                    <button onClick={() => removeVariant(vi)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Images for this color */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Images for this color</p>
                      {variant.images.length > 0 && (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleVariantImageDragEnd(vi)}>
                          <SortableContext items={variant.images.map(img => img.url)} strategy={rectSortingStrategy}>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {variant.images.map((img, ii) => (
                                <SortableVariantImage key={img.url} img={img} onRemove={() => removeImageFromVariant(vi, ii)} />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                      {variant.images.length > 1 && (
                        <p className="text-xs text-gray-400 mb-2">Drag to reorder · first image is cover</p>
                      )}
                      <div
                        onDragOver={e => { e.preventDefault(); setDraggingVariant(vi) }}
                        onDragLeave={e => { e.preventDefault(); setDraggingVariant(null) }}
                        onDrop={e => {
                          e.preventDefault(); setDraggingVariant(null)
                          const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                          uploadImagesForVariant(vi, files)
                        }}
                        onClick={() => !isUploading && fileRefs.current[vi]?.click()}
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer select-none transition-all ${
                          isDraggingThis ? 'border-black bg-black/5' :
                          isUploading ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' :
                          'border-gray-300 hover:border-gray-500 hover:bg-gray-50/50'
                        }`}
                      >
                        {isUploading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                            <span className="text-xs text-gray-500">Uploading…</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 pointer-events-none">
                            <Upload className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">Drag & drop or click · multiple files</span>
                          </div>
                        )}
                      </div>
                      <input ref={el => { fileRefs.current[vi] = el }} type="file" accept="image/*" multiple className="hidden"
                        onChange={e => e.target.files && uploadImagesForVariant(vi, Array.from(e.target.files))} />
                    </div>

                    {/* Sizes for this color */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-600">Sizes & Stock</p>
                        {selectedGuide && selectedGuide.rows.length > 0 && (
                          <button
                            onClick={() => importSizesToVariant(vi, selectedGuide)}
                            className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-500"
                          >
                            <Download className="w-3 h-3" /> Import from guide
                          </button>
                        )}
                      </div>
                      {variant.sizes.length > 0 && (
                        <table className="w-full text-sm mb-2">
                          <thead><tr className="border-b border-gray-100">
                            <th className="pb-1 text-left text-xs font-medium text-gray-400 w-28">Size</th>
                            <th className="pb-1 text-left text-xs font-medium text-gray-400 w-24">Stock</th>
                            <th className="pb-1 text-left text-xs font-medium text-gray-400">Status</th>
                            <th className="w-6"></th>
                          </tr></thead>
                          <tbody>
                            {variant.sizes.map((s, si) => (
                              <tr key={si}>
                                <td className="py-1 pr-2">
                                  <input value={s.size} onChange={e => updateVariant(vi, { sizes: variant.sizes.map((r, j) => j === si ? { ...r, size: e.target.value } : r) })}
                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-sm" />
                                </td>
                                <td className="py-1 pr-2">
                                  <input type="number" min={0} value={s.stock} onChange={e => updateVariant(vi, { sizes: variant.sizes.map((r, j) => j === si ? { ...r, stock: +e.target.value } : r) })}
                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-sm" />
                                </td>
                                <td className="py-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                    {s.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                  </span>
                                </td>
                                <td className="py-1">
                                  <button onClick={() => updateVariant(vi, { sizes: variant.sizes.filter((_, j) => j !== si) })} className="text-gray-300 hover:text-red-500">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <div className="flex gap-2 items-center">
                        <input placeholder="Size" value={newSizes[vi]?.size ?? ''} onChange={e => setNewSizes(prev => prev.map((s, i) => i === vi ? { ...s, size: e.target.value } : s))}
                          onKeyDown={e => e.key === 'Enter' && addSizeToVariant(vi)} className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                        <input type="number" placeholder="Stock" value={newSizes[vi]?.stock ?? 0} onChange={e => setNewSizes(prev => prev.map((s, i) => i === vi ? { ...s, stock: +e.target.value } : s))}
                          onKeyDown={e => e.key === 'Enter' && addSizeToVariant(vi)} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                        <button onClick={() => addSizeToVariant(vi)} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">
                          <Plus className="w-3.5 h-3.5" /> Add size
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Inventory settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Inventory Settings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Prices are set in Cost Calculator → Costumes Inventory</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Min Stock Alert</label>
                <input type="number" value={form.minStock} onChange={e => set('minStock', e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Internal Notes</label>
                <input value={form.productNotes} onChange={e => set('productNotes', e.target.value)} className={inputCls} /></div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Additional Info</h2>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Care Instructions (one per line)</label>
              <textarea value={form.careInstructions} onChange={e => set('careInstructions', e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Style Guide (one per line)</label>
              <textarea value={form.styleGuide} onChange={e => set('styleGuide', e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-tooltip mb-1">Shipping & Returns (one per line)</label>
              <textarea value={form.shippingInfo} onChange={e => set('shippingInfo', e.target.value)} rows={3} className={inputCls} /></div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Flags</h2>
              <p className="text-xs text-gray-400 mt-0.5">Status is managed in Costumes Inventory</p>
            </div>
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
            {selectedGuide && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{selectedGuide.unit} · {selectedGuide.columns.join(', ')}</p>
                {selectedGuide.rows.length > 0 && variants.length > 0 && (
                  <button
                    onClick={() => importSizesToAll(selectedGuide)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    <Download className="w-3.5 h-3.5" /> Import to all variants ({selectedGuide.rows.length} sizes)
                  </button>
                )}
              </div>
            )}
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
