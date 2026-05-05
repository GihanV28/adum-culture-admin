import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const content = await db.pageContent.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json({ success: true, data: { content } })
}

export async function PUT(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { key, title, body, imageUrl, data } = await req.json()
  const content = await db.pageContent.upsert({
    where: { key },
    update: { title, body, imageUrl, data },
    create: { key, title, body, imageUrl, data },
  })
  return NextResponse.json({ success: true, data: { content } })
}
