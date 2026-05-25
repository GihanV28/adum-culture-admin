import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { name, description, parentId, skuPrefix } = await req.json()
  const prefix = skuPrefix ? skuPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || null : null
  const category = await db.category.update({
    where: { id: params.id },
    data: { name, description, parentId: parentId || null, skuPrefix: prefix },
  })
  return NextResponse.json({ success: true, data: { category } })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  await db.category.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
