import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const variantImageSchema = z.object({ url: z.string(), order: z.number() })
const variantSizeSchema = z.object({ size: z.string(), stock: z.number() })

const colorVariantSchema = z.object({
  colorHex: z.string(),
  sku: z.string().nullish(),
  images: z.array(variantImageSchema).default([]),
  sizes: z.array(variantSizeSchema).default([]),
})

const schema = z.object({
  name: z.string().min(1), slug: z.string().min(1),
  productType: z.enum(['single', 'variable']).default('single'),
  itemCode: z.string().nullish(),
  description: z.string().optional(),
  price: z.number().positive(), comparePrice: z.number().optional(),
  costPrice: z.number().default(0),
  status: z.enum(['draft', 'published', 'active', 'inactive', 'out_of_stock']).default('draft'),
  featured: z.boolean().default(false), newArrival: z.boolean().default(false), bestSeller: z.boolean().default(false),
  stock: z.number().default(0), minStock: z.number().default(5),
  categoryId: z.string().nullish(), sizeGuideId: z.string().nullish(), productNotes: z.string().nullish(),
  modelDetails: z.string().nullish(), material: z.string().nullish(),
  careInstructions: z.array(z.string()).default([]), styleGuide: z.array(z.string()).default([]),
  shippingInfo: z.array(z.string()).default([]),
  images: z.array(variantImageSchema).default([]),
  sizes: z.array(variantSizeSchema).default([]),
  collectionIds: z.array(z.string()).default([]),
  colorVariants: z.array(colorVariantSchema).default([]),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const product = await db.product.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { order: 'asc' } }, sizes: true,
      collections: { include: { collection: true } },
      category: { select: { id: true, name: true } },
      stockRecord: true,
    },
  })
  if (!product) return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404 })
  return NextResponse.json({ success: true, data: { product } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())

    const totalStock = body.productType === 'variable'
      ? body.colorVariants.reduce((sum, cv) => sum + cv.sizes.reduce((s, sz) => s + sz.stock, 0), 0)
      : body.stock

    const colors = body.productType === 'variable'
      ? body.colorVariants.map(cv => cv.colorHex)
      : []

    // For single: clear and recreate images/sizes in their tables
    if (body.productType === 'single') {
      await db.productImage.deleteMany({ where: { productId: params.id } })
      await db.productSize.deleteMany({ where: { productId: params.id } })
    }
    await db.productCollection.deleteMany({ where: { productId: params.id } })

    const product = await db.product.update({
      where: { id: params.id },
      data: {
        name: body.name, slug: body.slug,
        productType: body.productType,
        itemCode: body.itemCode || null,
        description: body.description, price: body.price, comparePrice: body.comparePrice,
        costPrice: body.costPrice, status: body.status,
        featured: body.featured, newArrival: body.newArrival, bestSeller: body.bestSeller,
        stock: totalStock, minStock: body.minStock,
        categoryId: body.categoryId || null, sizeGuideId: body.sizeGuideId || null,
        productNotes: body.productNotes || null,
        colors, modelDetails: body.modelDetails, material: body.material,
        careInstructions: body.careInstructions, styleGuide: body.styleGuide, shippingInfo: body.shippingInfo,
        colorVariants: body.colorVariants,
        images: body.productType === 'single' ? { create: body.images } : undefined,
        sizes: body.productType === 'single' ? { create: body.sizes } : undefined,
        collections: { create: body.collectionIds.map(id => ({ collectionId: id })) },
        stockRecord: { upsert: { create: { quantity: totalStock }, update: { quantity: totalStock } } },
      },
      include: {
        images: { orderBy: { order: 'asc' } }, sizes: true,
        collections: { include: { collection: true } },
        category: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ success: true, data: { product } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.errors[0]
      const field = first.path.join('.')
      return NextResponse.json({ success: false, message: `${field ? field + ': ' : ''}${first.message}`, errors: err.errors }, { status: 400 })
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.[0] ?? 'field'
      const label = target === 'slug' ? 'slug' : target === 'itemCode' ? 'SKU (item code)' : target
      return NextResponse.json({ success: false, message: `A product with this ${label} already exists. Please use a different ${label}.` }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ success: false, message: 'Failed to update product. Please try again or contact support.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.product.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
