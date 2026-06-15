import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })

  const requests = await db.restockRequest.findMany({ orderBy: { createdAt: 'desc' } })

  return NextResponse.json({ success: true, data: { requests } })
}
