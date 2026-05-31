'use client'
import { useEffect, useState, useRef } from 'react'
import { adminFetch } from '@/lib/api'
import { getCached, setCached, invalidateCache } from '@/lib/admin-cache'
import { Plus, Trash2, ToggleLeft, ToggleRight, Upload, X, GripVertical, ArrowUpDown } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Skeleton } from '@/components/ui/Skeleton'

interface Slide { id: string; order: number; alt: string; desktopImageUrl: string; mobileImageUrl: string; active: boolean }

// ─── Sortable row inside the reorder modal ───────────────────────────────────
function SortableSlideRow({ slide }: { slide: Slide }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-lg mb-2 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="flex-shrink-0 w-16 h-10 rounded-md overflow-hidden border border-gray-100 bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slide.desktopImageUrl} alt={slide.alt} className="w-full h-full object-cover" />
      </div>
      <p className="flex-1 text-sm font-medium text-gray-900 truncate">{slide.alt}</p>
    </div>
  )
}

// ─── Reorder Modal ───────────────────────────────────────────────────────────
function ReorderModal({ slides, onClose, onSaved }: { slides: Slide[]; onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState<Slide[]>([...slides].sort((a, b) => a.order - b.order))
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIndex = prev.findIndex(s => s.id === active.id)
        const newIndex = prev.findIndex(s => s.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await adminFetch('/api/hero-slides/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items: items.map((s, i) => ({ id: s.id, order: i })) }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Change Slide Order</h2>
            <p className="text-xs text-gray-400 mt-0.5">Drag rows to reorder. Changes apply to the storefront hero.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {items.map(s => <SortableSlideRow key={s.id} slide={s} />)}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HeroSlidesPage() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ alt: '', desktopImageUrl: '', mobileImageUrl: '', active: true })
  const [uploading, setUploading] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  const [draggingField, setDraggingField] = useState<string | null>(null)
  const desktopRef = useRef<HTMLInputElement>(null)
  const mobileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    const cached = getCached<Slide[]>('hero-slides')
    if (cached) { setSlides(cached); setLoading(false); return }
    setLoading(true)
    adminFetch('/api/hero-slides').then(d => { const v = d.data.slides; setSlides(v); setCached('hero-slides', v); setLoading(false) }).catch(() => setLoading(false))
  }
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
    await adminFetch('/api/hero-slides', { method: 'POST', body: JSON.stringify({ ...form, order: slides.length }) })
    setForm({ alt: '', desktopImageUrl: '', mobileImageUrl: '', active: true })
    invalidateCache('hero-slides'); load(); setSaving(false)
  }

  const toggle = async (s: Slide) => {
    await adminFetch(`/api/hero-slides/${s.id}`, { method: 'PATCH', body: JSON.stringify({ active: !s.active }) })
    invalidateCache('hero-slides'); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this slide?')) return
    await adminFetch(`/api/hero-slides/${id}`, { method: 'DELETE' })
    invalidateCache('hero-slides'); load()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Hero Slides</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Add New Slide</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
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
              <div
                onDragOver={e => { e.preventDefault(); setDraggingField('desktop') }}
                onDragLeave={e => { e.preventDefault(); setDraggingField(null) }}
                onDrop={e => { e.preventDefault(); setDraggingField(null); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) uploadImage(f, 'desktopImageUrl') }}
                onClick={() => uploading !== 'desktopImageUrl' && desktopRef.current?.click()}
                className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer select-none transition-colors ${draggingField === 'desktop' ? 'border-black bg-black/5' : uploading === 'desktopImageUrl' ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-gray-300 text-gray-400 hover:border-gray-500'}`}
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs">{uploading === 'desktopImageUrl' ? 'Uploading…' : 'Drag & drop or click to upload'}</span>
              </div>
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
              <div
                onDragOver={e => { e.preventDefault(); setDraggingField('mobile') }}
                onDragLeave={e => { e.preventDefault(); setDraggingField(null) }}
                onDrop={e => { e.preventDefault(); setDraggingField(null); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) uploadImage(f, 'mobileImageUrl') }}
                onClick={() => uploading !== 'mobileImageUrl' && mobileRef.current?.click()}
                className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer select-none transition-colors ${draggingField === 'mobile' ? 'border-black bg-black/5' : uploading === 'mobileImageUrl' ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-gray-300 text-gray-400 hover:border-gray-500'}`}
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs">{uploading === 'mobileImageUrl' ? 'Uploading…' : 'Drag & drop or click to upload'}</span>
              </div>
            )}
            <input ref={mobileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'mobileImageUrl')} />
          </div>
        </div>
        <button onClick={create} disabled={!form.alt || !form.desktopImageUrl || !form.mobileImageUrl || saving}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-40">
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <Skeleton className="w-32 h-20 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full hidden sm:block shrink-0" />
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            </div>
          ))
        ) : slides.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">No slides yet.</div>
        ) : slides.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap sm:flex-nowrap items-center gap-4">
            <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.desktopImageUrl} alt={s.alt} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{s.alt}</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.active ? 'Active' : 'Hidden'}</span>
            <button onClick={() => toggle(s)} className="text-gray-400 hover:text-gray-700">
              {s.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
            <button onClick={() => del(s.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowReorder(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            Change Order
          </button>
        </div>
      )}

      {showReorder && (
        <ReorderModal
          slides={slides}
          onClose={() => setShowReorder(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
