import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

const USER_SECRET = process.env.USER_JWT_SECRET!

export function signUserToken(payload: { userId: string; email: string }) {
  return jwt.sign(payload, USER_SECRET, { expiresIn: '7d' })
}

export function verifyUserToken(token: string) {
  try {
    return jwt.verify(token, USER_SECRET) as { userId: string; email: string }
  } catch {
    return null
  }
}

export function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies.get('auth_token')?.value
  if (!token) return null
  return verifyUserToken(token)
}

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999))
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}
