import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { hashOtp } from '@/lib/user-auth'
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
  otp: z.string().length(6),
  purpose: z.enum(['password_reset', 'email_verification']),
  newPassword: z.string().min(8).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const { email, otp, purpose, newPassword } = schema.parse(await req.json())

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired code.' },
        { status: 400, headers: CORS }
      )
    }

    const tokenHash = hashOtp(otp)
    const otpToken = await db.otpToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!otpToken) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired code. Please request a new one.' },
        { status: 400, headers: CORS }
      )
    }

    if (purpose === 'password_reset') {
      if (!newPassword) {
        // OTP is valid but no password — don't consume it yet, just confirm validity
        return NextResponse.json({ success: true, message: 'Code verified.' }, { headers: CORS })
      }
      await db.otpToken.update({ where: { id: otpToken.id }, data: { used: true } })
      const passwordHash = await bcrypt.hash(newPassword, 12)
      await db.user.update({ where: { id: user.id }, data: { passwordHash } })
    } else {
      await db.otpToken.update({ where: { id: otpToken.id }, data: { used: true } })
      if (purpose === 'email_verification') {
        await db.user.update({ where: { id: user.id }, data: { emailVerified: true } })
      }
    }

    const message =
      purpose === 'password_reset'
        ? 'Password reset successfully. You can now sign in.'
        : 'Email verified successfully.'

    return NextResponse.json({ success: true, message }, { headers: CORS })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: err.errors }, { status: 400, headers: CORS })
    }
    console.error('[otp/verify]', err)
    return NextResponse.json(
      { success: false, message: 'Verification failed. Please try again.' },
      { status: 500, headers: CORS }
    )
  }
}
