import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

const schema = z.object({
  size: z.string().min(1),
  colorHex: z.string().optional().nullable(),
  colorName: z.string().optional().nullable(),
  name: z.string().min(1),
  email: z.string().email(),
})

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  let body
  try {
    body = schema.parse(await req.json())
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: err.errors }, { status: 400, headers: CORS })
    }
    return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400, headers: CORS })
  }

  const product = await db.product.findUnique({ where: { slug: params.slug } })
  if (!product) {
    return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404, headers: CORS })
  }

  await db.restockRequest.create({
    data: {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      size: body.size,
      colorHex: body.colorHex || null,
      colorName: body.colorName || null,
      customerName: body.name,
      customerEmail: body.email,
    },
  })

  return NextResponse.json({ success: true }, { headers: CORS })
}
