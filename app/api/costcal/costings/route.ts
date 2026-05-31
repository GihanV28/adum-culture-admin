import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

function serialize(c: { createdAt: Date; updatedAt: Date; [key: string]: unknown }) {
  return { ...c, createdAt: c.createdAt.getTime(), updatedAt: c.updatedAt.getTime() }
}

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const costings = await db.costCalCosting.findMany({ orderBy: { createdAt: 'desc' } })

  // Enrich with product data
  const productIds = costings.map(c => c.productId).filter(Boolean)
  const products = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, itemCode: true, images: { orderBy: { order: 'asc' }, take: 1 }, colorVariants: true },
      })
    : []

  const productMap = Object.fromEntries(products.map(p => [p.id, p]))

  return NextResponse.json({
    success: true,
    data: {
      costings: costings.map(c => ({
        ...serialize(c),
        product: productMap[c.productId] ?? null,
      })),
    },
  })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const body = await req.json()
  const {
    productId, fabricEntries, pieces, otherCosts,
    profitMode, profitUnit, profitValue,
    bnplTotal, bnplMerchant, gatewayPerc, vatPerc,
    deliveryTotal, deliveryMerchant,
    totalProductionCost, netProfit, recommendedPrice,
    originalPrice, sellingPrice, status,
  } = body

  if (!productId || totalProductionCost == null || sellingPrice == null) {
    return NextResponse.json({ success: false, message: 'productId, totalProductionCost and sellingPrice are required' }, { status: 400 })
  }

  // Upsert — one costing per product
  const costing = await db.costCalCosting.upsert({
    where: { productId },
    create: {
      productId, fabricEntries: fabricEntries ?? [], pieces: pieces ?? 1,
      otherCosts: otherCosts ?? [], profitMode: profitMode ?? 'PERCENT',
      profitUnit: profitUnit ?? 'PERCENT', profitValue: profitValue ?? 0,
      bnplTotal: bnplTotal ?? 0, bnplMerchant: bnplMerchant ?? 0,
      gatewayPerc: gatewayPerc ?? 0, vatPerc: vatPerc ?? 0,
      deliveryTotal: deliveryTotal ?? 0, deliveryMerchant: deliveryMerchant ?? 0,
      totalProductionCost, netProfit: netProfit ?? 0,
      recommendedPrice: recommendedPrice ?? sellingPrice,
      originalPrice: originalPrice ?? 0, sellingPrice,
      status: status ?? 'draft',
    },
    update: {
      fabricEntries: fabricEntries ?? [], pieces: pieces ?? 1,
      otherCosts: otherCosts ?? [], profitMode: profitMode ?? 'PERCENT',
      profitUnit: profitUnit ?? 'PERCENT', profitValue: profitValue ?? 0,
      bnplTotal: bnplTotal ?? 0, bnplMerchant: bnplMerchant ?? 0,
      gatewayPerc: gatewayPerc ?? 0, vatPerc: vatPerc ?? 0,
      deliveryTotal: deliveryTotal ?? 0, deliveryMerchant: deliveryMerchant ?? 0,
      totalProductionCost, netProfit: netProfit ?? 0,
      recommendedPrice: recommendedPrice ?? sellingPrice,
      originalPrice: originalPrice ?? 0, sellingPrice,
      status: status ?? 'draft',
    },
  })

  // Write back last-used price to each cost type (for auto-fill on next use)
  if (Array.isArray(otherCosts) && otherCosts.length > 0) {
    await Promise.all(
      (otherCosts as { label: string; amount: number }[]).map(c =>
        db.costCalProductionCostType.updateMany({
          where: { name: c.label },
          data: { defaultPrice: c.amount },
        })
      )
    )
  }

  // Write prices + status back to Product
  await db.product.update({
    where: { id: productId },
    data: {
      price: sellingPrice,
      comparePrice: originalPrice || undefined,
      status: status ?? 'draft',
    },
  })

  return NextResponse.json({ success: true, data: { costing: serialize(costing) } }, { status: 201 })
}
