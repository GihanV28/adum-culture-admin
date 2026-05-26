import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

function serialize(c: { createdAt: Date; updatedAt: Date; [key: string]: unknown }) {
  return { ...c, createdAt: c.createdAt.getTime(), updatedAt: c.updatedAt.getTime() }
}

// PATCH — update inventory row (prices + status only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { originalPrice, sellingPrice, status } = await req.json()

  const costing = await db.costCalCosting.update({
    where: { id: params.id },
    data: {
      originalPrice: originalPrice ?? 0,
      sellingPrice,
      status,
    },
  })

  // Always write back to Product immediately
  await db.product.update({
    where: { id: costing.productId },
    data: {
      price: sellingPrice,
      comparePrice: originalPrice || undefined,
      status,
    },
  })

  return NextResponse.json({ success: true, data: { costing: serialize(costing) } })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.costCalCosting.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
