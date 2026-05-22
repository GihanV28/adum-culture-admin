'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import SingleProductForm from '@/components/SingleProductForm'
import VariableProductForm from '@/components/VariableProductForm'
import { Loader2 } from 'lucide-react'

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
      setData({ product: p, collections: cd.data.collections })
    }).catch(console.error)
  }, [params.id])

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  )

  const p = data.product as Record<string, unknown>
  const productType = (p.productType as string) ?? 'single'
  const collections = data.collections as never[]

  if (productType === 'variable') {
    const variants = (p.colorVariants as unknown[]) ?? []
    return (
      <VariableProductForm
        id={params.id}
        collections={collections}
        initialVariants={variants as never}
        initial={{
          name: p.name as string,
          slug: p.slug as string,
          description: p.description as string ?? '',
          price: p.price as number,
          comparePrice: p.comparePrice as number ?? 0,
          costPrice: p.costPrice as number ?? 0,
          status: p.status as string,
          featured: p.featured as boolean,
          newArrival: p.newArrival as boolean,
          bestSeller: p.bestSeller as boolean,
          minStock: p.minStock as number ?? 5,
          categoryId: (p.category as { id?: string })?.id ?? p.categoryId as string ?? '',
          sizeGuideId: p.sizeGuideId as string ?? '',
          productNotes: p.productNotes as string ?? '',
          modelDetails: p.modelDetails as string ?? '',
          material: p.material as string ?? '',
          careInstructions: toStr(p.careInstructions),
          styleGuide: toStr(p.styleGuide),
          shippingInfo: toStr(p.shippingInfo),
          collectionIds: (p.collections as { collectionId: string }[])?.map(c => c.collectionId) ?? [],
        }}
      />
    )
  }

  // Single product
  const cv = ((p.colorVariants as unknown[]) ?? [])[0] as { colorHex?: string } | undefined
  return (
    <SingleProductForm
      id={params.id}
      collections={collections}
      initial={{
        name: p.name as string,
        slug: p.slug as string,
        itemCode: p.itemCode as string ?? '',
        description: p.description as string ?? '',
        price: p.price as number,
        comparePrice: p.comparePrice as number ?? 0,
        costPrice: p.costPrice as number ?? 0,
        status: p.status as string,
        featured: p.featured as boolean,
        newArrival: p.newArrival as boolean,
        bestSeller: p.bestSeller as boolean,
        stock: p.stock as number ?? 0,
        minStock: p.minStock as number ?? 5,
        categoryId: (p.category as { id?: string })?.id ?? p.categoryId as string ?? '',
        sizeGuideId: p.sizeGuideId as string ?? '',
        productNotes: p.productNotes as string ?? '',
        colorHex: cv?.colorHex ?? '#000000',
        modelDetails: p.modelDetails as string ?? '',
        material: p.material as string ?? '',
        careInstructions: toStr(p.careInstructions),
        styleGuide: toStr(p.styleGuide),
        shippingInfo: toStr(p.shippingInfo),
        images: (p.images as { url: string; order: number }[]) ?? [],
        sizes: (p.sizes as { size: string; stock: number }[])?.map(s => ({ size: s.size, stock: s.stock })) ?? [],
        collectionIds: (p.collections as { collectionId: string }[])?.map(c => c.collectionId) ?? [],
      }}
    />
  )
}
