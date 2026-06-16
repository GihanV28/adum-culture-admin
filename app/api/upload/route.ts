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
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    // Sanitize: keep only alphanumeric, dot, dash, underscore
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const fileName = `${Date.now()}-${safeName}`
    const contentType = file.type || 'application/octet-stream'

    const arrayBuffer = await file.arrayBuffer()

    const { error } = await supabase.storage
      .from('products')
      .upload(fileName, arrayBuffer, { contentType, upsert: true })

    if (error) {
      console.error('[Upload] Supabase error:', JSON.stringify(error))
      return NextResponse.json({ success: false, message: error.message, debug: error }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName)
    return NextResponse.json({ success: true, data: { url: publicUrl } })
  } catch (err) {
    console.error('[Upload] Exception:', err)
    return NextResponse.json({ success: false, message: String(err) }, { status: 500 })
  }
}
