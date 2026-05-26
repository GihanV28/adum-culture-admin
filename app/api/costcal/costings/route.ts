import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

function serialize(c: { createdAt: Date; [key: string]: unknown }) {
  return { ...c, createdAt: c.createdAt.getTime() }
}

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const costings = await db.costCalCosting.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ success: true, data: { costings: costings.map(serialize) } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { code, image, fabricId, totalProductionCost, netProfit, sellingPrice } = await req.json()
  if (!code || totalProductionCost == null || netProfit == null || sellingPrice == null) {
    return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
  }
  const costing = await db.costCalCosting.create({
    data: { code, image: image || null, fabricId: fabricId || null, totalProductionCost, netProfit, sellingPrice },
  })
  return NextResponse.json({ success: true, data: { costing: serialize(costing) } }, { status: 201 })
}
