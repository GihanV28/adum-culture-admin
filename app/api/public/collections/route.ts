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
  const collections = await db.collection.findMany({
    where: { published: true },
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } },
  })

  const shaped = collections.map(c => ({
    _id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.imageUrl ?? '',
    productCount: c._count.products,
  }))

  return NextResponse.json({ success: true, data: { collections: shaped } }, { headers: CORS })
}
