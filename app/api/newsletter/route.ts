import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const subscribers = await db.newsletterSubscriber.findMany({ orderBy: { subscribedAt: 'desc' } })
  return NextResponse.json({ success: true, data: { subscribers } })
}
