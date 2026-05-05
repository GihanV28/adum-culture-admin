'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import ProductForm from '@/components/ProductForm'

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ product: unknown; collections: unknown[] } | null>(null)

  useEffect(() => {
    Promise.all([
      adminFetch(`/api/products/${params.id}`),
      adminFetch('/api/collections'),
    ]).then(([pd, cd]) => {
      const p = pd.data.product
      setData({
        product: { ...p, collectionIds: p.collections.map((c: { collectionId: string }) => c.collectionId) },
        collections: cd.data.collections,
      })
    }).catch(console.error)
  }, [params.id])

  if (!data) return <div className="p-8 text-gray-400">Loading…</div>
  return <ProductForm id={params.id} initial={data.product as never} collections={data.collections as never} />
}
