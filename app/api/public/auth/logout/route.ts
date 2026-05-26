import { NextResponse } from 'next/server'

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

export async function POST() {
  const res = NextResponse.json({ success: true }, { headers: CORS })
  res.cookies.set('auth_token', '', { maxAge: 0, path: '/' })
  return res
}
