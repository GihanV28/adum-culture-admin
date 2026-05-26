import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

function serialize(f: { createdAt: Date; [key: string]: unknown }) {
  return { ...f, createdAt: f.createdAt.getTime() }
}

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const fabrics = await db.costCalFabric.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ success: true, data: { fabrics: fabrics.map(serialize) } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const body = await req.json()
  const { name, buyingDate, supplierName, supplierMobile, description, costPerUnit, quantity, unit, estimatedPieces, totalCost, images } = body
  if (!name || !supplierName || costPerUnit == null || totalCost == null) {
    return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
  }
  const fabric = await db.costCalFabric.create({
    data: { name, buyingDate, supplierName, supplierMobile: supplierMobile || null, description: description || null, costPerUnit, quantity: quantity ?? null, unit: unit || null, estimatedPieces: estimatedPieces ?? null, totalCost, images: images?.length ? images : null },
  })
  return NextResponse.json({ success: true, data: { fabric: serialize(fabric) } }, { status: 201 })
}
