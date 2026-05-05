import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  order: z.number().default(0),
  published: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const collections = await db.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json({ success: true, data: { collections } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    const collection = await db.collection.create({ data: body })
    return NextResponse.json({ success: true, data: { collection } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, errors: err.errors }, { status: 400 })
    return NextResponse.json({ success: false, message: 'Failed to create collection.' }, { status: 500 })
  }
}
