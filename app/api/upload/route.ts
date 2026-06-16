import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ success: false, message: 'No file provided.' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from('products')
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (error) {
      console.error('[Upload]', error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName)
    return NextResponse.json({ success: true, data: { url: publicUrl } })
  } catch (err) {
    console.error('[Upload]', err)
    return NextResponse.json({ success: false, message: 'Upload error.' }, { status: 500 })
  }
}
