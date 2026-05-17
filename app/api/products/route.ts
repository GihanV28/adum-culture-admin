import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  itemCode: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive(),
  comparePrice: z.number().optional(),
  costPrice: z.number().default(0),
  status: z.enum(['draft', 'published', 'active', 'inactive', 'out_of_stock']).default('draft'),
  featured: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  stock: z.number().default(0),
  minStock: z.number().default(5),
  unit: z.string().optional(),
  categoryId: z.string().optional(),
  productNotes: z.string().optional(),
  colors: z.array(z.string()).default([]),
  modelDetails: z.string().optional(),
  material: z.string().optional(),
  careInstructions: z.array(z.string()).default([]),
  styleGuide: z.array(z.string()).default([]),
  shippingInfo: z.array(z.string()).default([]),
  images: z.array(z.object({ url: z.string(), order: z.number() })).default([]),
  sizes: z.array(z.object({ size: z.string(), stock: z.number() })).default([]),
  collectionIds: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const products = await db.product.findMany({
    where: {
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { itemCode: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      images: { orderBy: { order: 'asc' }, take: 1 },
      sizes: true,
      collections: { include: { collection: true } },
      category: { select: { id: true, name: true } },
      stockRecord: { select: { quantity: true, reservedQuantity: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ success: true, data: { products } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    const product = await db.product.create({
      data: {
        name: body.name, slug: body.slug,
        itemCode: body.itemCode || null, barcode: body.barcode || null,
        description: body.description, price: body.price, comparePrice: body.comparePrice,
        costPrice: body.costPrice, status: body.status,
        featured: body.featured, newArrival: body.newArrival, bestSeller: body.bestSeller,
        stock: body.stock, minStock: body.minStock,
        unit: body.unit || null, categoryId: body.categoryId || null, productNotes: body.productNotes || null,
        colors: body.colors, modelDetails: body.modelDetails, material: body.material,
        careInstructions: body.careInstructions, styleGuide: body.styleGuide, shippingInfo: body.shippingInfo,
        images: { create: body.images },
        sizes: { create: body.sizes },
        collections: { create: body.collectionIds.map(id => ({ collectionId: id })) },
        stockRecord: { create: { quantity: body.stock } },
      },
      include: {
        images: true, sizes: true,
        collections: { include: { collection: true } },
        category: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ success: true, data: { product } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, errors: err.errors }, { status: 400 })
    console.error(err)
    return NextResponse.json({ success: false, message: 'Failed to create product.' }, { status: 500 })
  }
}
