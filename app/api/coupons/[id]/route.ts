import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const body = await req.json()
  const coupon = await db.adminCoupon.update({ where: { id: params.id }, data: body })
  return NextResponse.json({ success: true, data: { coupon } })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.adminCoupon.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
