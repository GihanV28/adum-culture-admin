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

type ColorVariantRaw = {
  colorHex: string
  colorName?: string
  sku?: string | null
  images?: { url: string; order: number }[]
  sizes?: { size: string; stock: number }[]
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
      sizeGuide: true,
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  })

  const shaped = products.map(p => {
    const variants = (p.colorVariants as ColorVariantRaw[] | null) ?? []
    const isVariable = p.productType === 'variable'

    // For variable: images come from first variant; for single: from ProductImage table
    const defaultImages = isVariable
      ? (variants[0]?.images ?? []).sort((a, b) => a.order - b.order).map(i => i.url)
      : p.images.map(img => img.url)

    // Sizes: for single from ProductSize table; for variable aggregate from variants
    const sizes = isVariable
      ? Object.entries(
          variants.flatMap(cv => cv.sizes ?? []).reduce((acc: Record<string, number>, s) => {
            acc[s.size] = (acc[s.size] ?? 0) + s.stock
            return acc
          }, {})
        ).map(([size, quantity]) => ({ size, quantity }))
      : p.sizes.map(s => ({ size: s.size, quantity: s.stock }))

    return {
      _id: p.id,
      name: p.name,
      slug: p.slug,
      itemCode: p.itemCode,
      productType: p.productType,
      description: p.description,
      price: p.price,
      originalPrice: p.comparePrice,
      images: defaultImages,
      sizes,
      colors: (p.colors as string[]) ?? [],
      colorVariants: variants.map(cv => ({
        colorHex: cv.colorHex,
        colorName: cv.colorName ?? null,
        sku: cv.sku ?? null,
        images: (cv.images ?? []).sort((a, b) => a.order - b.order).map(i => i.url),
        sizes: (cv.sizes ?? []).map(s => ({ size: s.size, stock: s.stock })),
      })),
      sizeGuideData: p.sizeGuide ? {
        name: p.sizeGuide.name,
        note: p.sizeGuide.note,
        unit: p.sizeGuide.unit,
        columns: p.sizeGuide.columns,
        rows: p.sizeGuide.rows,
      } : null,
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
      returnInfo: (p.returnInfo as string[]) ?? [],
      displayOrder: p.displayOrder,
      createdAt: p.createdAt.toISOString(),
    }
  })

  return NextResponse.json({ success: true, data: { products: shaped } }, { headers: CORS })
}
