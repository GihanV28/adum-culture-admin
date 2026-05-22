import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const variantImageSchema = z.object({ url: z.string(), order: z.number() })
const variantSizeSchema = z.object({ size: z.string(), stock: z.number() })

const colorVariantSchema = z.object({
  colorHex: z.string(),
  sku: z.string().nullish(),
  images: z.array(variantImageSchema).default([]),
  sizes: z.array(variantSizeSchema).default([]),
})

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  productType: z.enum(['single', 'variable']).default('single'),
  itemCode: z.string().nullish(),
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
  categoryId: z.string().nullish(),
  sizeGuideId: z.string().nullish(),
  productNotes: z.string().nullish(),
  modelDetails: z.string().nullish(),
  material: z.string().nullish(),
  careInstructions: z.array(z.string()).default([]),
  styleGuide: z.array(z.string()).default([]),
  shippingInfo: z.array(z.string()).default([]),
  // Single product: images in ProductImage table, one colorVariant entry
  images: z.array(variantImageSchema).default([]),
  sizes: z.array(variantSizeSchema).default([]),
  collectionIds: z.array(z.string()).default([]),
  // Both types: colorVariants stores per-color data
  colorVariants: z.array(colorVariantSchema).default([]),
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

    // Aggregate total stock from colorVariants for variable products
    const totalStock = body.productType === 'variable'
      ? body.colorVariants.reduce((sum, cv) => sum + cv.sizes.reduce((s, sz) => s + sz.stock, 0), 0)
      : body.stock

    // For variable: aggregate colors list from variants for backward compat
    const colors = body.productType === 'variable'
      ? body.colorVariants.map(cv => cv.colorHex)
      : []

    const product = await db.product.create({
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
        // Single products use ProductImage + ProductSize tables; variable products use colorVariants JSON
        images: body.productType === 'single' ? { create: body.images } : undefined,
        sizes: body.productType === 'single' ? { create: body.sizes } : undefined,
        collections: { create: body.collectionIds.map(id => ({ collectionId: id })) },
        stockRecord: { create: { quantity: totalStock } },
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
