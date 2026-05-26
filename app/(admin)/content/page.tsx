'use client'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { adminFetch } from '@/lib/api'
import { Save, Upload, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface ContentBlock {
  id: string; key: string; title?: string; body?: string; imageUrl?: string
  data?: Record<string, string>
}

// Contact info stored as JSON in the `data` field
const DEFAULT_CONTACT: Record<string, string> = {
  description: '', address: '', email: '', phone: '',
  whatsappUrl: '', instagramUrl: '', instagramLabel: 'Instagram',
  facebookUrl: '', facebookLabel: 'Facebook',
}

const DEFAULT_VALUES: Record<string, string> = {
  value1_title: 'Beyond the Fabrics',
  value1_body: "We believe clothing is an extension of who you are. We empower our community to wear their unique identity with absolute pride, offering more than just garments — we offer a lifestyle and a platform for self-expression.",
  value2_title: 'Bold Craftsmanship',
  value2_body: "Quality is our signature. We merge international street-style trends with premium materials, ensuring every piece is architecturally designed to look stunning and feel incredible to wear.",
  value3_title: 'Passion & Perseverance',
  value3_body: "Built from the ground up by a young couple's hard-earned investments and tireless effort, we value the grind. Authenticity, resilience, and heart are woven into the very core of our brand.",
  value4_title: 'Global Vision',
  value4_body: "We dream big. While our roots ground us, our designs are crafted to transcend borders, delivering a truly international standard of premium fashion to the world.",
}

const CONTENT_KEYS = [
  { key: 'contact_info',         label: 'Contact Us',            type: 'contact',  description: 'Get In Touch section on the Contact page' },
  { key: 'about_us',             label: 'About Us',              type: 'about',    description: 'Description and image for the About page' },
  { key: 'about_values',         label: 'Our Values',            type: 'values',   description: 'Four value cards shown on the About page' },
  { key: 'about_story',          label: 'Our Story',             type: 'story',    description: 'Short version shown on the homepage' },
  { key: 'shipping_info',        label: 'Shipping Policy',       type: 'policy',   description: 'Shipping policy page content' },
  { key: 'returns_policy',       label: 'Exchange & Refund',     type: 'policy',   description: 'Exchange & refund policy content' },
  { key: 'international_shipping', label: 'International Shipping', type: 'policy', description: 'International shipping policy content' },
  { key: 'privacy_policy',       label: 'Privacy Policy',        type: 'policy',   description: 'Privacy policy content' },
  { key: 'terms_of_service',     label: 'Terms of Service',      type: 'policy',   description: 'Terms of service content' },
]

export default function ContentPage() {
  const [blocks, setBlocks] = useState<Record<string, ContentBlock>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<ContentBlock>>({})
  const [contactData, setContactData] = useState<Record<string, string>>({ ...DEFAULT_CONTACT })
  const [valuesData, setValuesData] = useState<Record<string, string>>({ ...DEFAULT_VALUES })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    adminFetch('/api/content').then(d => {
      const map: Record<string, ContentBlock> = {}
      d.data.content.forEach((c: ContentBlock) => { map[c.key] = c })
      setBlocks(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const openEdit = (key: string) => {
    if (editing === key) { setEditing(null); return }
    const block = blocks[key]
    setEditing(key)
    setForm(block ?? { key, title: '', body: '', imageUrl: '' })
    if (key === 'contact_info') {
      setContactData({ ...DEFAULT_CONTACT, ...(block?.data ?? {}) })
    }
    if (key === 'about_values') {
      setValuesData({ ...DEFAULT_VALUES, ...(block?.data ?? {}) })
    }
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const token = localStorage.getItem('admin_token')
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
    const data = await res.json()
    if (data.success) setForm(f => ({ ...f, imageUrl: data.data.url }))
    setUploading(false)
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    const payload = editing === 'contact_info'
      ? { key: editing, data: contactData }
      : editing === 'about_values'
      ? { key: editing, data: valuesData }
      : { ...form, key: editing }
    const d = await adminFetch('/api/content', { method: 'PUT', body: JSON.stringify(payload) })
    setBlocks(b => ({ ...b, [editing]: d.data.content }))
    setSaved(editing); setTimeout(() => setSaved(''), 2500)
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Page Content</h1>
      <p className="text-sm text-gray-500 mb-6 sm:mb-8">Edit text and content for your website pages.</p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56 hidden sm:block" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {CONTENT_KEYS.map(({ key, label, type, description }) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header row */}
              <button onClick={() => openEdit(key)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="min-w-0">
                  <span className="font-medium text-gray-900">{label}</span>
                  <span className="ml-3 text-xs text-gray-400 hidden sm:inline">{description}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-4">{editing === key ? '▲ Close' : '▼ Edit'}</span>
              </button>

              {editing === key && (
                <div className="px-4 sm:px-6 pb-6 border-t border-gray-100 pt-5 space-y-4">

                  {/* ── CONTACT type ── */}
                  {type === 'contact' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea value={contactData.description} rows={2}
                          onChange={e => setContactData(d => ({ ...d, description: e.target.value }))}
                          className={inputCls} placeholder="Have a question? Reach out to our team." />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                          <textarea value={contactData.address} rows={2}
                            onChange={e => setContactData(d => ({ ...d, address: e.target.value }))}
                            className={inputCls} placeholder="Adum Culture,&#10;Kiribathgoda, Sri Lanka 11600" />
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                            <input value={contactData.email}
                              onChange={e => setContactData(d => ({ ...d, email: e.target.value }))}
                              className={inputCls} placeholder="info@adumculture.com" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Phone / WhatsApp Number</label>
                            <input value={contactData.phone}
                              onChange={e => setContactData(d => ({ ...d, phone: e.target.value }))}
                              className={inputCls} placeholder="+94 76 061 3070" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp URL</label>
                        <input value={contactData.whatsappUrl}
                          onChange={e => setContactData(d => ({ ...d, whatsappUrl: e.target.value }))}
                          className={inputCls} placeholder="https://wa.me/94760613070" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Instagram URL</label>
                          <input value={contactData.instagramUrl}
                            onChange={e => setContactData(d => ({ ...d, instagramUrl: e.target.value }))}
                            className={inputCls} placeholder="https://instagram.com/adum_culture" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Instagram Label</label>
                          <input value={contactData.instagramLabel}
                            onChange={e => setContactData(d => ({ ...d, instagramLabel: e.target.value }))}
                            className={inputCls} placeholder="Instagram" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Facebook URL</label>
                          <input value={contactData.facebookUrl}
                            onChange={e => setContactData(d => ({ ...d, facebookUrl: e.target.value }))}
                            className={inputCls} placeholder="https://facebook.com/adumculture" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Facebook Label</label>
                          <input value={contactData.facebookLabel}
                            onChange={e => setContactData(d => ({ ...d, facebookLabel: e.target.value }))}
                            className={inputCls} placeholder="Facebook" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── ABOUT type ── */}
                  {type === 'about' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea value={form.body ?? ''} rows={5}
                          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                          className={inputCls} placeholder="About Us page description…" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Page Image</label>
                        {form.imageUrl ? (
                          <div className="flex items-center gap-4">
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                              <Image src={form.imageUrl} alt="" fill className="object-cover" />
                            </div>
                            <button onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700">
                              <X className="w-4 h-4" /> Remove image
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 disabled:opacity-50">
                            {uploading
                              ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                              : <><Upload className="w-4 h-4" /> Upload image</>}
                          </button>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                      </div>
                    </>
                  )}

                  {/* ── VALUES type ── */}
                  {type === 'values' && (
                    <div className="space-y-6">
                      <p className="text-xs text-gray-400">Edit the four value cards shown in the &quot;Our Values&quot; section on the About page.</p>
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Value 0{n}</p>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                            <input
                              value={valuesData[`value${n}_title`] ?? ''}
                              onChange={e => setValuesData(d => ({ ...d, [`value${n}_title`]: e.target.value }))}
                              className={inputCls}
                              placeholder={`Value ${n} title`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                            <textarea
                              value={valuesData[`value${n}_body`] ?? ''}
                              rows={3}
                              onChange={e => setValuesData(d => ({ ...d, [`value${n}_body`]: e.target.value }))}
                              className={inputCls}
                              placeholder={`Value ${n} description`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── STORY type ── */}
                  {type === 'story' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Section Title</label>
                        <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          className={inputCls} placeholder="Our Story" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea value={form.body ?? ''} rows={5}
                          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                          className={inputCls} placeholder="Short description shown on the homepage…" />
                      </div>
                    </>
                  )}

                  {/* ── POLICY type ── */}
                  {type === 'policy' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Content <span className="text-gray-400 font-normal">(use blank lines to separate paragraphs)</span>
                      </label>
                      <textarea value={form.body ?? ''} rows={12}
                        onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                        className={inputCls} placeholder="Enter policy content…" />
                    </div>
                  )}

                  <button onClick={save} disabled={saving || uploading}
                    className="flex items-center gap-2 px-5 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : saved === key ? '✓ Saved!' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
