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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const guide = await db.sizeGuide.findUnique({ where: { id: params.id } })
  if (!guide) return NextResponse.json({ success: false }, { status: 404 })
  return NextResponse.json({ success: true, data: { guide } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    const guide = await db.sizeGuide.update({ where: { id: params.id }, data: body })
    return NextResponse.json({ success: true, data: { guide } })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, errors: err.errors }, { status: 400 })
    return NextResponse.json({ success: false, message: 'Failed to update.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.sizeGuide.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
