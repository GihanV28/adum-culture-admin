'use client'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { adminFetch } from '@/lib/api'
import { Upload, Trash2, Pencil, Check, X, FileText } from 'lucide-react'

interface SizeGuide {
  id: string
  name: string
  fileUrl: string
  fileType: 'image' | 'pdf'
  _count: { products: number }
}

export default function SizeGuidesPage() {
  const [guides, setGuides] = useState<SizeGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const d = await adminFetch('/api/size-guides').catch(() => null)
    if (d) setGuides(d.data.guides)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const uploadFile = async (file: File) => {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const token = localStorage.getItem('admin_token')
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
    const data = await res.json()
    if (data.success) {
      setFileUrl(data.data.url)
      setFileType(file.type === 'application/pdf' ? 'pdf' : 'image')
    }
    setUploading(false)
  }

  const create = async () => {
    if (!name.trim() || !fileUrl) return
    setSaving(true)
    await adminFetch('/api/size-guides', { method: 'POST', body: JSON.stringify({ name, fileUrl, fileType }) })
    setName(''); setFileUrl(''); setFileType('image')
    load(); setSaving(false)
  }

  const saveEdit = async (id: string, guide: SizeGuide) => {
    await adminFetch(`/api/size-guides/${id}`, { method: 'PUT', body: JSON.stringify({ name: editName, fileUrl: guide.fileUrl, fileType: guide.fileType }) })
    setEditId(null); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this size guide? Products using it will lose the association.')) return
    await adminFetch(`/api/size-guides/${id}`, { method: 'DELETE' })
    load()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Size Guides</h1>
          <p className="text-sm text-gray-500 mt-1">Upload size charts to attach to products</p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Add New Size Guide</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Women's Tops, Saree Guide" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">File (JPG, PNG, PDF) *</label>
            {fileUrl ? (
              <div className="flex items-center gap-3 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                {fileType === 'pdf' ? (
                  <FileText className="w-5 h-5 text-red-500 shrink-0" />
                ) : (
                  <div className="relative w-8 h-8 rounded overflow-hidden shrink-0">
                    <Image src={fileUrl} alt="" fill className="object-cover" />
                  </div>
                )}
                <span className="text-xs text-gray-600 truncate flex-1">File uploaded</span>
                <button onClick={() => { setFileUrl(''); setFileType('image') }} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 disabled:opacity-50">
                {uploading ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <><Upload className="w-4 h-4" /> Choose file</>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          </div>
        </div>

        {/* Preview */}
        {fileUrl && fileType === 'image' && (
          <div className="relative w-full max-w-sm h-48 rounded-lg overflow-hidden border border-gray-200">
            <Image src={fileUrl} alt="Preview" fill className="object-contain bg-gray-50" />
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={create} disabled={saving || uploading || !name.trim() || !fileUrl}
            className="px-5 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Size Guide'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : guides.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No size guides yet.</div>
        ) : guides.map(g => (
          <div key={g.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-0">
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 shrink-0 flex items-center justify-center">
              {g.fileType === 'pdf'
                ? <FileText className="w-7 h-7 text-red-400" />
                : <Image src={g.fileUrl} alt={g.name} width={56} height={56} className="w-full h-full object-cover" />}
            </div>

            {/* Name / Edit */}
            <div className="flex-1">
              {editId === g.id ? (
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black w-full max-w-xs" autoFocus />
              ) : (
                <>
                  <p className="font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-400">{g.fileType.toUpperCase()} · {g._count.products} product{g._count.products !== 1 ? 's' : ''}</p>
                </>
              )}
            </div>

            {/* View link */}
            <a href={g.fileUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline shrink-0">View</a>

            {/* Edit / Save / Delete */}
            {editId === g.id ? (
              <>
                <button onClick={() => saveEdit(g.id, g)} className="p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditId(null)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <button onClick={() => { setEditId(g.id); setEditName(g.name) }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => del(g.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
