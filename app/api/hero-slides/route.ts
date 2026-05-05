import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const slides = await db.heroSlide.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json({ success: true, data: { slides } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const body = await req.json()
  const slide = await db.heroSlide.create({ data: { alt: body.alt, desktopImageUrl: body.desktopImageUrl, mobileImageUrl: body.mobileImageUrl, order: body.order ?? 0, active: body.active ?? true } })
  return NextResponse.json({ success: true, data: { slide } }, { status: 201 })
}
