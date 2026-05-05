import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signAdminToken } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const { email, password } = schema.parse(await req.json())
    const admin = await db.adminUser.findUnique({ where: { email } })
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 })
    }
    const token = signAdminToken({ adminId: admin.id, email: admin.email })
    const res = NextResponse.json({ success: true, data: { admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }, token } })
    const isProd = process.env.NODE_ENV === 'production'
    res.cookies.set('admin_token', token, { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/', maxAge: 60 * 60 * 12 })
    return res
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 })
  }
}
