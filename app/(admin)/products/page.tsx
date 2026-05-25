'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { adminFetch } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

interface Product { id: string; name: string; slug: string; itemCode?: string | null; productType?: string; price: number; status: string; featured: boolean; images: { url: string }[]; sizes: { size: string; stock: number }[]; colorVariants?: { sizes: { stock: number }[] }[] }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const d = await adminFetch(`/api/products?search=${search}`)
    setProducts(d.data.products)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const del = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await adminFetch(`/api/products/${id}`, { method: 'DELETE' })
    load()
  }

  const totalStock = (p: Product) => {
    if (p.productType === 'variable' && p.colorVariants?.length) {
      return p.colorVariants.reduce((sum, cv) => sum + cv.sizes.reduce((s, sz) => s + sz.stock, 0), 0)
    }
    return p.sizes.reduce((s, z) => s + z.stock, 0)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Link href="/products/new" className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-4">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none placeholder:text-gray-400" />
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No products found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Product</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Price</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Stock</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500"></th>
            </tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {p.images[0] ? <Image src={p.images[0].url} alt={p.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover bg-gray-100" /> : <div className="w-10 h-10 rounded-lg bg-gray-100" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(p as {productType?: string}).productType === 'variable' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {(p as {productType?: string}).productType === 'variable' ? 'Variable' : 'Single'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{p.itemCode ?? p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">{formatCurrency(p.price)}</td>
                  <td className="px-6 py-3">{totalStock(p)} units</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/products/${p.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></Link>
                      <button onClick={() => del(p.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
