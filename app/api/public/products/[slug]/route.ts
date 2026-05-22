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
  sku?: string | null
  images?: { url: string; order: number }[]
  sizes?: { size: string; stock: number }[]
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const p = await db.product.findUnique({
    where: { slug: params.slug },
    include: {
      images: { orderBy: { order: 'asc' } },
      sizes: true,
      collections: { include: { collection: true } },
      sizeGuide: true,
    },
  })

  if (!p || !['published', 'active'].includes(p.status)) {
    return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404, headers: CORS })
  }

  const variants = (p.colorVariants as ColorVariantRaw[] | null) ?? []
  const isVariable = p.productType === 'variable'

  const defaultImages = isVariable
    ? (variants[0]?.images ?? []).sort((a, b) => a.order - b.order).map(i => i.url)
    : p.images.map(img => img.url)

  const sizes = isVariable
    ? Object.entries(
        variants.flatMap(cv => cv.sizes ?? []).reduce((acc: Record<string, number>, s) => {
          acc[s.size] = (acc[s.size] ?? 0) + s.stock
          return acc
        }, {})
      ).map(([size, quantity]) => ({ size, quantity }))
    : p.sizes.map(s => ({ size: s.size, quantity: s.stock }))

  return NextResponse.json({
    success: true,
    data: {
      product: {
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
      },
    },
  }, { headers: CORS })
}
