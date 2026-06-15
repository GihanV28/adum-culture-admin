import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { status } = await req.json()
  if (!['pending', 'notified', 'dismissed'].includes(status)) {
    return NextResponse.json({ success: false, message: 'Invalid status.' }, { status: 400 })
  }
  const request = await db.restockRequest.update({ where: { id: params.id }, data: { status } })
  return NextResponse.json({ success: true, data: { request } })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.restockRequest.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
