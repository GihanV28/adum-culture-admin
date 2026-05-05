import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  const slides = await db.heroSlide.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  })

  const shaped = slides.map(s => ({
    _id: s.id,
    order: s.order,
    alt: s.alt,
    desktopImage: s.desktopImageUrl,
    mobileImage: s.mobileImageUrl,
  }))

  return NextResponse.json({ success: true, data: { slides: shaped } }, { headers: CORS })
}
