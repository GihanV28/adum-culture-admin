'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import ProductForm from '@/components/ProductForm'

// Helper: convert DB array/JSON to the string format the form expects
const toStr = (val: unknown, sep = '\n'): string => {
  if (!val) return ''
  if (Array.isArray(val)) return val.join(sep)
  if (typeof val === 'string') return val
  return ''
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ product: unknown; collections: unknown[] } | null>(null)

  useEffect(() => {
    Promise.all([
      adminFetch(`/api/products/${params.id}`),
      adminFetch('/api/collections'),
    ]).then(([pd, cd]) => {
      const p = pd.data.product
      setData({
        product: {
          ...p,
          // Convert arrays → strings for textarea/input fields
          colors: toStr(p.colors, ', '),
          careInstructions: toStr(p.careInstructions),
          styleGuide: toStr(p.styleGuide),
          shippingInfo: toStr(p.shippingInfo),
          // Flatten relations
          collectionIds: p.collections.map((c: { collectionId: string }) => c.collectionId),
          categoryId: p.category?.id || p.categoryId || '',
          // Normalise numeric fields
          price: p.price ?? 0,
          comparePrice: p.comparePrice ?? 0,
          costPrice: p.costPrice ?? 0,
          stock: p.stock ?? 0,
          minStock: p.minStock ?? 5,
        },
        collections: cd.data.collections,
      })
    }).catch(console.error)
  }, [params.id])

  if (!data) return <div className="p-8 text-gray-400">Loading…</div>
  return <ProductForm id={params.id} initial={data.product as never} collections={data.collections as never} />
}
