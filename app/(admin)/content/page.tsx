'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { Save } from 'lucide-react'

interface ContentBlock { id: string; key: string; title?: string; body?: string; imageUrl?: string }

const CONTENT_KEYS = [
  { key: 'homepage_hero', label: 'Homepage Hero', fields: ['title', 'body', 'imageUrl'] },
  { key: 'homepage_banner', label: 'Homepage Banner', fields: ['title', 'body', 'imageUrl'] },
  { key: 'about_hero', label: 'About Page Hero', fields: ['title', 'body', 'imageUrl'] },
  { key: 'about_story', label: 'Our Story', fields: ['title', 'body'] },
  { key: 'shipping_info', label: 'Shipping Information', fields: ['body'] },
  { key: 'returns_policy', label: 'Returns Policy', fields: ['body'] },
]

export default function ContentPage() {
  const [blocks, setBlocks] = useState<Record<string, ContentBlock>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<ContentBlock>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    adminFetch('/api/content').then(d => {
      const map: Record<string, ContentBlock> = {}
      d.data.content.forEach((c: ContentBlock) => { map[c.key] = c })
      setBlocks(map)
    }).catch(console.error)
  }, [])

  const startEdit = (key: string) => {
    setEditing(key)
    setForm(blocks[key] ?? { key, title: '', body: '', imageUrl: '' })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    const d = await adminFetch('/api/content', { method: 'PUT', body: JSON.stringify({ ...form, key: editing }) })
    setBlocks(b => ({ ...b, [editing]: d.data.content }))
    setSaved(editing); setTimeout(() => setSaved(''), 2000)
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Content</h1>
      <p className="text-sm text-gray-500 mb-8">Edit text and images for your website pages.</p>

      <div className="space-y-4">
        {CONTENT_KEYS.map(({ key, label, fields }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button onClick={() => setEditing(editing === key ? null : key)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">{label}</span>
                {blocks[key]?.title && <span className="text-xs text-gray-400 truncate max-w-48">{blocks[key].title}</span>}
              </div>
              <span className="text-xs text-gray-400">{editing === key ? '▲ Close' : '▼ Edit'}</span>
            </button>

            {editing === key && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-3">
                {fields.includes('title') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Section title" />
                  </div>
                )}
                {fields.includes('body') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Body Text</label>
                    <textarea value={form.body ?? ''} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} className={inputCls} placeholder="Content text…" />
                  </div>
                )}
                {fields.includes('imageUrl') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
                    <input value={form.imageUrl ?? ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className={inputCls} placeholder="https://…" />
                  </div>
                )}
                <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : saved === key ? '✓ Saved!' : 'Save'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
