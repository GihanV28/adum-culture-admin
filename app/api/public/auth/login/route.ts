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
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const { email, password } = schema.parse(await req.json())

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        passwordHash: true,
      },
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 401, headers: CORS }
      )
    }

    const { passwordHash: _, ...userWithoutHash } = user
    const token = signUserToken({ userId: user.id, email: user.email })
    const isProd = process.env.NODE_ENV === 'production'

    const res = NextResponse.json(
      { success: true, data: { user: userWithoutHash, token } },
      { headers: CORS }
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
    console.error('[login]', err)
    return NextResponse.json(
      { success: false, message: 'Login failed. Please try again.' },
      { status: 500, headers: CORS }
    )
  }
}
