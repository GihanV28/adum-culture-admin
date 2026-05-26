import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.costCalCosting.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
