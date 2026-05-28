import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const CORS_ORIGIN = process.env.STOREFRONT_URL ?? 'http://localhost:3000'
const CORS = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

const schema = z.object({
  code: z.string().min(1),
  subtotal: z.number(),
})

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = schema.parse(await req.json())

    const coupon = await db.adminCoupon.findFirst({
      where: { code: code.toUpperCase(), active: true },
    })

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: 'Invalid coupon code.' },
        { status: 400, headers: CORS }
      )
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, message: 'This coupon has expired.' },
        { status: 400, headers: CORS }
      )
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { success: false, message: 'This coupon has reached its usage limit.' },
        { status: 400, headers: CORS }
      )
    }

    if (subtotal < coupon.minOrderValue) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum order value of LKR ${coupon.minOrderValue.toLocaleString()} required.`,
        },
        { status: 400, headers: CORS }
      )
    }

    const discountAmount =
      coupon.discountType === 'percentage'
        ? Math.min(Math.round((subtotal * coupon.discountValue) / 100), subtotal)
        : Math.min(coupon.discountValue, subtotal)

    return NextResponse.json(
      {
        success: true,
        data: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount,
        },
      },
      { headers: CORS }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: err.errors }, { status: 400, headers: CORS })
    }
    return NextResponse.json(
      { success: false, message: 'Failed to validate coupon.' },
      { status: 500, headers: CORS }
    )
  }
}
