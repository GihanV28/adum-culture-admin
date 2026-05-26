import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

function serialize(f: { createdAt: Date; [key: string]: unknown }) {
  return { ...f, createdAt: f.createdAt.getTime() }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const body = await req.json()
  const { name, buyingDate, supplierName, supplierMobile, description, costPerUnit, quantity, unit, estimatedPieces, totalCost, image } = body
  const fabric = await db.costCalFabric.update({
    where: { id: params.id },
    data: { name, buyingDate, supplierName, supplierMobile: supplierMobile || null, description: description || null, costPerUnit, quantity: quantity ?? null, unit: unit || null, estimatedPieces: estimatedPieces ?? null, totalCost, image: image || null },
  })
  return NextResponse.json({ success: true, data: { fabric: serialize(fabric) } })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.costCalFabric.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
