import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(1).toUpperCase(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  minOrderValue: z.number().default(0),
  maxUses: z.number().optional(),
  active: z.boolean().default(true),
  expiresAt: z.string().optional(),
})

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const coupons = await db.adminCoupon.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ success: true, data: { coupons } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    const coupon = await db.adminCoupon.create({
      data: { ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null },
    })
    return NextResponse.json({ success: true, data: { coupon } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, errors: err.errors }, { status: 400 })
    return NextResponse.json({ success: false, message: 'Failed to create coupon.' }, { status: 500 })
  }
}
