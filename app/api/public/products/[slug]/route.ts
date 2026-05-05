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

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const p = await db.product.findUnique({
    where: { slug: params.slug },
    include: {
      images: { orderBy: { order: 'asc' } },
      sizes: true,
      collections: { include: { collection: true } },
    },
  })

  if (!p || p.status !== 'published') {
    return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404, headers: CORS })
  }

  return NextResponse.json({
    success: true,
    data: {
      product: {
        _id: p.id,
        name: p.name,
        slug: p.slug,
        itemCode: p.itemCode,
        description: p.description,
        price: p.price,
        originalPrice: p.comparePrice,
        images: p.images.map(img => img.url),
        sizes: p.sizes.map(s => s.size),
        sizesWithStock: p.sizes.map(s => ({ size: s.size, stock: s.stock })),
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
      },
    },
  }, { headers: CORS })
}
