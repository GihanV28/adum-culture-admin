'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { adminFetch } from '@/lib/api'
import { getCached, setCached, invalidateCache } from '@/lib/admin-cache'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Pencil, Trash2, ArrowUpDown, GripVertical, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Product { id: string; name: string; slug: string; itemCode?: string | null; productType?: string; price: number; status: string; featured: boolean; images: { url: string }[]; sizes: { size: string; stock: number }[]; colorVariants?: { images?: { url: string; order: number }[]; sizes: { stock: number }[] }[] }

function ProductsSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-0">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20 hidden sm:block shrink-0" />
          <Skeleton className="h-4 w-16 hidden md:block shrink-0" />
          <Skeleton className="h-6 w-20 rounded-full hidden sm:block shrink-0" />
          <div className="flex gap-1 shrink-0">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SortableProductRow({ product }: { product: Product }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id })
  const imgUrl = product.images[0]?.url ?? product.colorVariants?.[0]?.images?.sort((a, b) => a.order - b.order)?.[0]?.url
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-lg mb-2 shadow-sm"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none shrink-0">
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 shrink-0">
        {imgUrl ? <Image src={imgUrl} alt={product.name} width={36} height={36} className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
        <p className="text-xs text-gray-400 truncate">{product.itemCode ?? product.slug}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${product.status === 'published' ? 'bg-green-100 text-green-700' : product.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
        {product.status === 'active' ? 'Published + ORM' : product.status}
      </span>
    </div>
  )
}

function ReorderModal({ products, onClose, onSaved }: { products: Product[]; onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState<Product[]>([...products])
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIndex = prev.findIndex(p => p.id === active.id)
        const newIndex = prev.findIndex(p => p.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await adminFetch('/api/products/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items: items.map((p, i) => ({ id: p.id, order: i })) }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Change Display Order</h2>
            <p className="text-xs text-gray-400 mt-0.5">Drag to reorder. This order applies to the storefront shop page and all collection pages.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {items.map(p => <SortableProductRow key={p.id} product={p} />)}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showReorder, setShowReorder] = useState(false)

  const load = useCallback(async () => {
    if (!search) {
      const cached = getCached<Product[]>('products')
      if (cached) { setProducts(cached); setLoading(false); return }
    }
    setLoading(true)
    const d = await adminFetch(`/api/products?search=${search}`)
    const prods = d.data.products
    setProducts(prods)
    if (!search) setCached('products', prods)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const del = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await adminFetch(`/api/products/${id}`, { method: 'DELETE' })
    invalidateCache('products'); load()
  }

  const totalStock = (p: Product) => {
    if (p.productType === 'variable' && p.colorVariants?.length) {
      return p.colorVariants.reduce((sum, cv) => sum + cv.sizes.reduce((s, sz) => s + sz.stock, 0), 0)
    }
    return p.sizes.reduce((s, z) => s + z.stock, 0)
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h1>
        <Link href="/products/new" className="flex items-center gap-2 bg-black text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none placeholder:text-gray-400" />
        </div>
        {loading ? (
          <ProductsSkeleton />
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="border-b border-gray-100 text-left">
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Product</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Price</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Stock</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500"></th>
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const imgUrl = p.images[0]?.url ?? p.colorVariants?.[0]?.images?.sort((a, b) => a.order - b.order)?.[0]?.url
                          return imgUrl
                            ? <Image src={imgUrl} alt={p.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                            : <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                        })()}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 truncate">{p.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${p.productType === 'variable' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                              {p.productType === 'variable' ? 'Variable' : 'Single'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{p.itemCode ?? p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{formatCurrency(p.price)}</td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{totalStock(p)} units</td>
                    <td className="px-4 sm:px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${p.status === 'published' ? 'bg-green-100 text-green-700' : p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {p.status === 'active' ? 'Published + ORM' : p.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex items-center gap-1 sm:gap-2 justify-end">
                        <Link href={`/products/${p.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></Link>
                        <button onClick={() => del(p.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!search && products.length > 1 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowReorder(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            Change Order
          </button>
        </div>
      )}

      {showReorder && (
        <ReorderModal
          products={products}
          onClose={() => setShowReorder(false)}
          onSaved={() => { invalidateCache('products'); load() }}
        />
      )}
    </div>
  )
}
