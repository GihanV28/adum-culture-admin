import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [totalOrders, todayOrders, totalRevenue, totalUsers, totalProducts, recentOrders] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: today } } }),
    db.order.aggregate({ where: { paymentStatus: 'paid' }, _sum: { total: true } }),
    db.user.count(),
    db.product.count(),
    db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ])
  return NextResponse.json({
    success: true,
    data: { totalOrders, todayOrders, totalRevenue: totalRevenue._sum.total ?? 0, totalUsers, totalProducts, recentOrders },
  })
}
