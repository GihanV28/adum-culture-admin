'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import ProductForm from '@/components/ProductForm'

export default function NewProductPage() {
  const [collections, setCollections] = useState([])
  useEffect(() => { adminFetch('/api/collections').then(d => setCollections(d.data.collections)).catch(() => {}) }, [])
  return <ProductForm collections={collections} />
}
