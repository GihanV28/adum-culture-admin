import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

interface VariantSize { size: string; stock: number }
interface ColorVariant { sizes?: VariantSize[] }

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })

  const products = await db.product.findMany({
    where: { status: { in: ['published', 'active'] } },
    include: { images: { orderBy: { order: 'asc' }, take: 1 }, sizes: true },
    orderBy: { updatedAt: 'desc' },
  })

  const soldOut = products.filter(p => {
    const colorVariants = p.colorVariants as ColorVariant[] | null
    const totalStock = colorVariants && colorVariants.length > 0
      ? colorVariants.reduce((sum, cv) => sum + (cv.sizes ?? []).reduce((s, sz) => s + (sz.stock ?? 0), 0), 0)
      : p.sizes.reduce((sum, s) => sum + s.stock, 0)
    return totalStock === 0
  })

  return NextResponse.json({
    success: true,
    data: {
      products: soldOut.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        itemCode: p.itemCode,
        stock: p.stock,
        image: p.images[0]?.url ?? null,
        updatedAt: p.updatedAt,
      })),
    },
  })
}
