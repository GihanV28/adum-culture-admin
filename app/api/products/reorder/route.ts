import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { items } = await req.json() as { items: { id: string; order: number }[] }

  await Promise.all(
    items.map(({ id, order }) =>
      db.product.update({ where: { id }, data: { displayOrder: order } })
    )
  )

  return NextResponse.json({ success: true })
}
