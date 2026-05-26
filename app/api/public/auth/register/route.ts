import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signUserToken } from '@/lib/user-auth'
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
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const existing = await db.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists.' },
        { status: 409, headers: CORS }
      )
    }

    const passwordHash = await bcrypt.hash(body.password, 12)
    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        phone: body.phone ?? null,
        emailVerified: true,
      },
      select: { id: true, name: true, email: true, phone: true, emailVerified: true },
    })

    const token = signUserToken({ userId: user.id, email: user.email })
    const isProd = process.env.NODE_ENV === 'production'
    const res = NextResponse.json(
      { success: true, data: { user, token } },
      { status: 201, headers: CORS }
    )
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: err.errors }, { status: 400, headers: CORS })
    }
    console.error('[register]', err)
    return NextResponse.json(
      { success: false, message: 'Registration failed. Please try again.' },
      { status: 500, headers: CORS }
    )
  }
}
