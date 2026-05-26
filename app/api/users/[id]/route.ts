import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

type Ctx = { params: { id: string } }

// PATCH — toggle suspend/unsuspend
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { id } = params
  const body = await req.json()
  const user = await db.user.update({
    where: { id },
    data: { suspended: body.suspended },
    select: { id: true, suspended: true },
  })
  return NextResponse.json({ success: true, data: { user } })
}

// DELETE — permanently remove user and all related data
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  const { id } = params
  await db.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
