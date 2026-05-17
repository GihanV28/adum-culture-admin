import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(_req: NextRequest, { params }: { params: { key: string } }) {
  const content = await db.pageContent.findUnique({ where: { key: params.key } })
  if (!content) return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404, headers: CORS })
  return NextResponse.json({ success: true, data: { content } }, { headers: CORS })
}
