import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1), slug: z.string().min(1),
  description: z.string().optional(), imageUrl: z.string().optional(),
  order: z.number().default(0), published: z.boolean().default(true),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    const collection = await db.collection.update({ where: { id: params.id }, data: body })
    return NextResponse.json({ success: true, data: { collection } })
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to update.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.collection.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
