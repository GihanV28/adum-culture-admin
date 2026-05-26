import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/user-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const CORS_ORIGIN = process.env.STOREFRONT_URL ?? 'http://localhost:3000'

const CORS = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req)
  if (!session) {
    return NextResponse.json({ success: false }, { status: 401, headers: CORS })
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, phone: true, emailVerified: true },
  })

  if (!user) {
    return NextResponse.json({ success: false }, { status: 401, headers: CORS })
  }

  return NextResponse.json({ success: true, data: { user } }, { headers: CORS })
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
})

export async function PUT(req: NextRequest) {
  const session = getUserFromRequest(req)
  if (!session) {
    return NextResponse.json({ success: false }, { status: 401, headers: CORS })
  }

  try {
    const body = updateSchema.parse(await req.json())
    const user = await db.user.update({
      where: { id: session.userId },
      data: { ...(body.name ? { name: body.name } : {}), phone: body.phone ?? null },
      select: { id: true, name: true, email: true, phone: true, emailVerified: true },
    })
    return NextResponse.json({ success: true, data: { user } }, { headers: CORS })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: err.errors }, { status: 400, headers: CORS })
    }
    console.error('[profile/put]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to update profile.' },
      { status: 500, headers: CORS }
    )
  }
}
