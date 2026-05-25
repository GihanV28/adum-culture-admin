import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  })
  return NextResponse.json({ success: true, data: { categories } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { name, description, parentId, skuPrefix } = await req.json()
  if (!name) return NextResponse.json({ success: false, message: 'Name required' }, { status: 400 })
  const prefix = skuPrefix ? skuPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || null : null
  try {
    const category = await db.category.create({ data: { name, description, parentId: parentId || null, skuPrefix: prefix } })
    return NextResponse.json({ success: true, data: { category } }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, message: 'Category name must be unique' }, { status: 400 })
  }
}
