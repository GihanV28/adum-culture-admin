import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? ''
  const bestSeller = searchParams.get('bestSeller') === 'true'
  const newArrival = searchParams.get('newArrival') === 'true'
  const featured = searchParams.get('featured') === 'true'
  const limit = parseInt(searchParams.get('limit') ?? '100')

  const products = await db.product.findMany({
    where: {
      status: { in: ['published', 'active'] },
      ...(bestSeller ? { bestSeller: true } : {}),
      ...(newArrival ? { newArrival: true } : {}),
      ...(featured ? { featured: true } : {}),
      ...(category ? { collections: { some: { collection: { slug: category } } } } : {}),
    },
    include: {
      images: { orderBy: { order: 'asc' } },
      sizes: true,
      collections: { include: { collection: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  const shaped = products.map(p => ({
    _id: p.id,
    name: p.name,
    slug: p.slug,
    itemCode: p.itemCode,
    description: p.description,
    price: p.price,
    originalPrice: p.comparePrice,
    images: p.images.map(img => img.url),
    sizes: p.sizes.map(s => ({ size: s.size, quantity: s.stock })),
    colors: (p.colors as string[]) ?? [],
    newArrival: p.newArrival,
    bestSeller: p.bestSeller,
    featured: p.featured,
    stock: p.stock,
    category: p.collections[0]?.collection.slug ?? '',
    categoryName: p.collections[0]?.collection.name ?? '',
    modelDetails: p.modelDetails,
    material: p.material,
    careInstructions: (p.careInstructions as string[]) ?? [],
    styleGuide: (p.styleGuide as string[]) ?? [],
    shippingInfo: (p.shippingInfo as string[]) ?? [],
  }))

  return NextResponse.json({ success: true, data: { products: shaped } }, { headers: CORS })
}
