import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const order = await db.order.findUnique({ where: { id: params.id } })
  if (!order) return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404 })
  return NextResponse.json({ success: true, data: { order } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const body = await req.json()
  const allowed = ['status', 'paymentStatus']
  const data: Record<string, string> = {}
  for (const key of allowed) if (body[key]) data[key] = body[key]
  const order = await db.order.update({ where: { id: params.id }, data })
  return NextResponse.json({ success: true, data: { order } })
}
