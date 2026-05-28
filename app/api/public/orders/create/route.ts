import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/user-auth'
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

const itemSchema = z.object({
  sku: z.string().optional(),
  slug: z.string().optional(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().int().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
  image: z.string().optional(),
})

const schema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional(),
  shippingAddress: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  district: z.string().min(1),
  postalCode: z.string().optional(),
  paymentMethod: z.string().default('cod'),
  couponCode: z.string().optional(),
  customerNote: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const session = getUserFromRequest(req)

    // Calculate subtotal from items
    const subtotal = body.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const shippingCost = subtotal >= 10000 ? 0 : 250

    // Validate and apply coupon
    let discount = 0
    let appliedCouponCode: string | undefined

    if (body.couponCode) {
      const coupon = await db.adminCoupon.findFirst({
        where: {
          code: body.couponCode.toUpperCase(),
          active: true,
        },
      })

      if (
        coupon &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        subtotal >= coupon.minOrderValue &&
        (!coupon.maxUses || coupon.usedCount < coupon.maxUses)
      ) {
        discount =
          coupon.discountType === 'percentage'
            ? Math.min(Math.round((subtotal * coupon.discountValue) / 100), subtotal)
            : Math.min(coupon.discountValue, subtotal)
        appliedCouponCode = coupon.code

        await db.adminCoupon.update({
          where: { code: coupon.code },
          data: { usedCount: { increment: 1 } },
        })
      }
    }

    const total = Math.max(0, subtotal - discount) + shippingCost

    const order = await db.order.create({
      data: {
        userId: session?.userId ?? null,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail ?? null,
        shippingAddress: body.shippingAddress,
        addressLine2: body.addressLine2 ?? null,
        city: body.city,
        district: body.district,
        postalCode: body.postalCode ?? null,
        paymentMethod: body.paymentMethod,
        paymentStatus: 'pending',
        status: 'open',
        subtotal,
        shippingCost,
        discount,
        total,
        couponCode: appliedCouponCode ?? null,
        customerNote: body.customerNote ?? null,
        source: 'ecommerce',
        items: body.items,
      },
      select: { id: true, orderNumber: true },
    })

    // Record coupon usage for logged-in users
    if (appliedCouponCode && session?.userId) {
      await db.couponUsage.upsert({
        where: { couponCode_userId: { couponCode: appliedCouponCode, userId: session.userId } },
        create: { couponCode: appliedCouponCode, userId: session.userId },
        update: {},
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          requiresPayment: false, // Set to true once OnePay is configured
        },
      },
      { headers: CORS }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: err.errors }, { status: 400, headers: CORS })
    }
    console.error('[orders/create]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to place order. Please try again.' },
      { status: 500, headers: CORS }
    )
  }
}
