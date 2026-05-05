import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1), slug: z.string().min(1), itemCode: z.string().optional(),
  description: z.string().optional(), price: z.number().positive(), comparePrice: z.number().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  featured: z.boolean().default(false), newArrival: z.boolean().default(false),
  bestSeller: z.boolean().default(false), stock: z.number().default(0),
  colors: z.array(z.string()).default([]), modelDetails: z.string().optional(), material: z.string().optional(),
  careInstructions: z.array(z.string()).default([]), styleGuide: z.array(z.string()).default([]),
  shippingInfo: z.array(z.string()).default([]),
  images: z.array(z.object({ url: z.string(), order: z.number() })).default([]),
  sizes: z.array(z.object({ size: z.string(), stock: z.number() })).default([]),
  collectionIds: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const product = await db.product.findUnique({
    where: { id: params.id },
    include: { images: { orderBy: { order: 'asc' } }, sizes: true, collections: { include: { collection: true } } },
  })
  if (!product) return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404 })
  return NextResponse.json({ success: true, data: { product } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    await db.productImage.deleteMany({ where: { productId: params.id } })
    await db.productSize.deleteMany({ where: { productId: params.id } })
    await db.productCollection.deleteMany({ where: { productId: params.id } })
    const product = await db.product.update({
      where: { id: params.id },
      data: {
        name: body.name, slug: body.slug, itemCode: body.itemCode || null,
        description: body.description, price: body.price, comparePrice: body.comparePrice,
        status: body.status, featured: body.featured, newArrival: body.newArrival,
        bestSeller: body.bestSeller, stock: body.stock,
        colors: body.colors, modelDetails: body.modelDetails, material: body.material,
        careInstructions: body.careInstructions, styleGuide: body.styleGuide, shippingInfo: body.shippingInfo,
        images: { create: body.images },
        sizes: { create: body.sizes },
        collections: { create: body.collectionIds.map(id => ({ collectionId: id })) },
      },
      include: { images: { orderBy: { order: 'asc' } }, sizes: true, collections: { include: { collection: true } } },
    })
    return NextResponse.json({ success: true, data: { product } })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, errors: err.errors }, { status: 400 })
    console.error(err)
    return NextResponse.json({ success: false, message: 'Failed to update.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.product.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
