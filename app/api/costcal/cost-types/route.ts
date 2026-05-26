import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const types = await db.costCalProductionCostType.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ success: true, data: { types } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    const type = await db.costCalProductionCostType.create({ data: body })
    return NextResponse.json({ success: true, data: { type } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, errors: err.errors }, { status: 400 })
    if ((err as { code?: string }).code === 'P2002')
      return NextResponse.json({ success: false, message: 'A cost type with that name already exists.' }, { status: 409 })
    return NextResponse.json({ success: false, message: 'Failed to create cost type.' }, { status: 500 })
  }
}
