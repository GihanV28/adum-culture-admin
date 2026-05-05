import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const SECRET = process.env.ADMIN_JWT_SECRET!

export function signAdminToken(payload: { adminId: string; email: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' })
}

export function verifyAdminToken(token: string) {
  try {
    return jwt.verify(token, SECRET) as { adminId: string; email: string }
  } catch {
    return null
  }
}

export function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies.get('admin_token')?.value
  if (!token) return null
  return verifyAdminToken(token)
}
