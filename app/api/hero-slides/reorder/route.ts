import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  items: z.array(z.object({ id: z.string(), order: z.number().int() })).min(1),
})

export async function PATCH(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const { items } = schema.parse(await req.json())
    await db.$transaction(
      items.map(({ id, order }) => db.heroSlide.update({ where: { id }, data: { order } }))
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, errors: err.errors }, { status: 400 })
    return NextResponse.json({ success: false, message: 'Failed to reorder.' }, { status: 500 })
  }
}
