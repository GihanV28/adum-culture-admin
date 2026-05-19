import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  note: z.string().optional(),
  unit: z.enum(['CM', 'INCH', 'BOTH']).default('INCH'),
  columns: z.array(z.string()).default([]),
  rows: z.array(z.object({ size: z.string(), values: z.array(z.string()) })).default([]),
})

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const guides = await db.sizeGuide.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true } } },
  })
  return NextResponse.json({ success: true, data: { guides } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    const guide = await db.sizeGuide.create({ data: body })
    return NextResponse.json({ success: true, data: { guide } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, errors: err.errors }, { status: 400 })
    return NextResponse.json({ success: false, message: 'Failed to create.' }, { status: 500 })
  }
}
