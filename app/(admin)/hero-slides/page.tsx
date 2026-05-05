'use client'
import { useEffect, useState, useRef } from 'react'
import { adminFetch } from '@/lib/api'
import { Plus, Trash2, ToggleLeft, ToggleRight, Upload, X } from 'lucide-react'

interface Slide { id: string; order: number; alt: string; desktopImageUrl: string; mobileImageUrl: string; active: boolean }

export default function HeroSlidesPage() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [form, setForm] = useState({ alt: '', desktopImageUrl: '', mobileImageUrl: '', order: 0, active: true })
  const [uploading, setUploading] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const desktopRef = useRef<HTMLInputElement>(null)
  const mobileRef = useRef<HTMLInputElement>(null)

  const load = () => adminFetch('/api/hero-slides').then(d => setSlides(d.data.slides)).catch(console.error)
  useEffect(() => { load() }, [])

  const uploadImage = async (file: File, field: 'desktopImageUrl' | 'mobileImageUrl') => {
    setUploading(field)
    const fd = new FormData(); fd.append('file', file)
    const token = localStorage.getItem('admin_token')
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
    const data = await res.json()
    if (data.success) setForm(f => ({ ...f, [field]: data.data.url }))
    setUploading(null)
  }

  const create = async () => {
    if (!form.alt || !form.desktopImageUrl || !form.mobileImageUrl) return
    setSaving(true)
    await adminFetch('/api/hero-slides', { method: 'POST', body: JSON.stringify(form) })
    setForm({ alt: '', desktopImageUrl: '', mobileImageUrl: '', order: 0, active: true })
    load(); setSaving(false)
  }

  const toggle = async (s: Slide) => {
    await adminFetch(`/api/hero-slides/${s.id}`, { method: 'PATCH', body: JSON.stringify({ active: !s.active }) })
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this slide?')) return
    await adminFetch(`/api/hero-slides/${id}`, { method: 'DELETE' })
    load()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Hero Slides</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Add New Slide</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Alt Text *</label>
            <input value={form.alt} onChange={e => setForm(f => ({ ...f, alt: e.target.value }))} className={inputCls} placeholder="Description for accessibility" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desktop Image * (landscape)</label>
            {form.desktopImageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 h-32">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.desktopImageUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm(f => ({ ...f, desktopImageUrl: '' }))} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => desktopRef.current?.click()} disabled={uploading === 'desktopImageUrl'}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400">
                <Upload className="w-5 h-5" />
                <span className="text-xs">{uploading === 'desktopImageUrl' ? 'Uploading…' : 'Upload desktop image'}</span>
              </button>
            )}
            <input ref={desktopRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'desktopImageUrl')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Image * (portrait)</label>
            {form.mobileImageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 h-32">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.mobileImageUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm(f => ({ ...f, mobileImageUrl: '' }))} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => mobileRef.current?.click()} disabled={uploading === 'mobileImageUrl'}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400">
                <Upload className="w-5 h-5" />
                <span className="text-xs">{uploading === 'mobileImageUrl' ? 'Uploading…' : 'Upload mobile image'}</span>
              </button>
            )}
            <input ref={mobileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'mobileImageUrl')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Order</label>
            <input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: +e.target.value }))} className={inputCls} />
          </div>
        </div>
        <button onClick={create} disabled={!form.alt || !form.desktopImageUrl || !form.mobileImageUrl || saving}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-40">
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      <div className="space-y-4">
        {slides.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">No slides yet.</div>
        ) : slides.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.desktopImageUrl} alt={s.alt} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{s.alt}</p>
              <p className="text-xs text-gray-400 mt-0.5">Order: {s.order}</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.active ? 'Active' : 'Hidden'}</span>
            <button onClick={() => toggle(s)} className="text-gray-400 hover:text-gray-700">
              {s.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
            <button onClick={() => del(s.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
