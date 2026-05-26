import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOtp, hashOtp } from '@/lib/user-auth'
import { sendOtpEmail } from '@/lib/email'
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
  purpose: z.enum(['password_reset', 'email_verification']),
})

export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = schema.parse(await req.json())

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      // Don't reveal whether the email is registered
      return NextResponse.json(
        { success: true, message: 'If that email is registered, a code has been sent.' },
        { headers: CORS }
      )
    }

    // Invalidate existing unused OTPs for same user + purpose
    await db.otpToken.updateMany({
      where: { userId: user.id, purpose, used: false },
      data: { used: true },
    })

    const otp = generateOtp()
    const tokenHash = hashOtp(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await db.otpToken.create({
      data: { userId: user.id, tokenHash, purpose, expiresAt },
    })

    await sendOtpEmail(email, otp, purpose)

    return NextResponse.json(
      { success: true, message: 'A 6-digit code has been sent to your email.' },
      { headers: CORS }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: err.errors }, { status: 400, headers: CORS })
    }
    console.error('[otp/send]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to send code. Please try again.' },
      { status: 500, headers: CORS }
    )
  }
}
