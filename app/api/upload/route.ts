import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ success: false, message: 'No file provided.' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const bucket = 'products'
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: await file.arrayBuffer(),
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      console.error('[Upload]', err)
      return NextResponse.json({ success: false, message: 'Upload failed.' }, { status: 500 })
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`
    return NextResponse.json({ success: true, data: { url: publicUrl } })
  } catch (err) {
    console.error('[Upload]', err)
    return NextResponse.json({ success: false, message: 'Upload error.' }, { status: 500 })
  }
}
