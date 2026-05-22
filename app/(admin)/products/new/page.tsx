'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import ProductTypeModal from '@/components/ProductTypeModal'
import SingleProductForm from '@/components/SingleProductForm'
import VariableProductForm from '@/components/VariableProductForm'

export default function NewProductPage() {
  const [collections, setCollections] = useState([])
  const [productType, setProductType] = useState<'single' | 'variable' | null>(null)

  useEffect(() => {
    adminFetch('/api/collections').then(d => setCollections(d.data.collections)).catch(() => {})
  }, [])

  if (!productType) {
    return <ProductTypeModal onSelect={setProductType} onClose={() => history.back()} />
  }

  if (productType === 'single') return <SingleProductForm collections={collections} />
  return <VariableProductForm collections={collections} />
}
