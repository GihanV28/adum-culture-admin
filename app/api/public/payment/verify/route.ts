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

const schema = z.object({ orderId: z.string() })

export async function POST(req: NextRequest) {
  try {
    const { orderId } = schema.parse(await req.json())

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, paymentStatus: true, status: true },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found.' },
        { status: 404, headers: CORS }
      )
    }

    return NextResponse.json(
      { success: true, data: { paymentStatus: order.paymentStatus } },
      { headers: CORS }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: err.errors }, { status: 400, headers: CORS })
    }
    return NextResponse.json(
      { success: false, message: 'Failed to verify payment.' },
      { status: 500, headers: CORS }
    )
  }
}
