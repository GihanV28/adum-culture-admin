import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const where = {
    ...(search ? { OR: [{ customerName: { contains: search, mode: 'insensitive' as const } }, { customerPhone: { contains: search } }, { ormOrderNumber: { contains: search } }] } : {}),
    ...(status ? { status } : {}),
  }
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    db.order.count({ where }),
  ])
  return NextResponse.json({ success: true, data: { orders, total, page, pages: Math.ceil(total / limit) } })
}
