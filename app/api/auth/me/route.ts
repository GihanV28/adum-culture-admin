import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = getAdminFromRequest(req)
  if (!session) return NextResponse.json({ success: false }, { status: 401 })
  const admin = await db.adminUser.findUnique({ where: { id: session.adminId }, select: { id: true, name: true, email: true, role: true } })
  if (!admin) return NextResponse.json({ success: false }, { status: 401 })
  return NextResponse.json({ success: true, data: { admin } })
}
