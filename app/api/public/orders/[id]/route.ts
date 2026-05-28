import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CORS_ORIGIN = process.env.STOREFRONT_URL ?? 'http://localhost:3000'
const CORS = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = await db.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      ormOrderNumber: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      total: true,
      subtotal: true,
      shippingCost: true,
      discount: true,
      items: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      shippingAddress: true,
      city: true,
      district: true,
    },
  })

  if (!order) {
    return NextResponse.json(
      { success: false, message: 'Order not found.' },
      { status: 404, headers: CORS }
    )
  }

  return NextResponse.json({ success: true, data: { order } }, { headers: CORS })
}
