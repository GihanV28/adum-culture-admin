'use client'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { adminFetch } from '@/lib/api'
import { slugify } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Check, Upload, GripVertical, ArrowUpDown } from 'lucide-react'
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

interface Collection { id: string; name: string; slug: string; description?: string; imageUrl?: string; published: boolean; order: number; _count: { products: number } }

// ─── Sortable row inside the reorder modal ───────────────────────────────────
function SortableCollectionRow({ collection }: { collection: Collection }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: collection.id })
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
      <div className="flex-shrink-0 w-9 h-9 rounded-md overflow-hidden border border-gray-100 bg-gray-50">
        {collection.imageUrl
          ? <Image src={collection.imageUrl} alt={collection.name} width={36} height={36} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">–</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{collection.name}</p>
        <p className="text-xs text-gray-400 truncate">{collection.slug}</p>
      </div>
    </div>
  )
}

// ─── Reorder Modal ───────────────────────────────────────────────────────────
function ReorderModal({ collections, onClose, onSaved }: { collections: Collection[]; onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState<Collection[]>([...collections].sort((a, b) => a.order - b.order))
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIndex = prev.findIndex(c => c.id === active.id)
        const newIndex = prev.findIndex(c => c.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await adminFetch('/api/collections/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items: items.map((c, i) => ({ id: c.id, order: i })) }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Change Collection Order</h2>
            <p className="text-xs text-gray-400 mt-0.5">Drag rows to reorder. Changes apply to the storefront.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sortable list */}
        <div className="flex-1 overflow-y-auto p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {items.map(c => <SortableCollectionRow key={c.id} collection={c} />)}
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
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
export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [form, setForm] = useState({ name: '', slug: '', description: '', imageUrl: '', published: true })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Collection>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editUploading, setEditUploading] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  const load = () => adminFetch('/api/collections').then(d => setCollections(d.data.collections)).catch(console.error)
  useEffect(() => { load() }, [])

  const uploadImage = async (file: File, isEdit = false) => {
    isEdit ? setEditUploading(true) : setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const token = localStorage.getItem('admin_token')
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
    const data = await res.json()
    if (data.success) {
      if (isEdit) setEditForm(f => ({ ...f, imageUrl: data.data.url }))
      else setForm(f => ({ ...f, imageUrl: data.data.url }))
    }
    isEdit ? setEditUploading(false) : setUploading(false)
  }

  const create = async () => {
    if (!form.name) return
    setSaving(true)
    await adminFetch('/api/collections', { method: 'POST', body: JSON.stringify(form) })
    setForm({ name: '', slug: '', description: '', imageUrl: '', published: true })
    load(); setSaving(false)
  }

  const save = async (id: string) => {
    await adminFetch(`/api/collections/${id}`, { method: 'PUT', body: JSON.stringify(editForm) })
    setEditId(null); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this collection?')) return
    await adminFetch(`/api/collections/${id}`, { method: 'DELETE' })
    load()
  }

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Collections</h1>

      {/* New Collection Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-900">New Collection</h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} className={inputCls} />
          <input placeholder="Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputCls} />
        </div>
        <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputCls} w-full`} />

        {/* Image upload */}
        <div className="flex items-center gap-4">
          {form.imageUrl ? (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
              <Image src={form.imageUrl} alt="" fill className="object-cover" />
              <button onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-400 disabled:opacity-50 flex-shrink-0">
              {uploading
                ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                : <><Upload className="w-4 h-4" /><span className="text-xs">Image</span></>}
            </button>
          )}
          <p className="text-xs text-gray-400">Optional cover image shown on the storefront collection page.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} /> Published
          </label>
          <button onClick={create} disabled={saving || uploading} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add Collection
          </button>
        </div>
      </div>

      {/* Collections List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {collections.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No collections yet.</div>
        ) : collections.map(c => (
          <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-0">
            {editId === c.id ? (
              <>
                {/* Edit mode image */}
                <div className="flex-shrink-0">
                  {editForm.imageUrl ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                      <Image src={editForm.imageUrl} alt="" fill className="object-cover" />
                      <button onClick={() => setEditForm(f => ({ ...f, imageUrl: '' }))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => editFileRef.current?.click()} disabled={editUploading}
                      className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 disabled:opacity-50">
                      {editUploading ? <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <Upload className="w-3 h-3" />}
                    </button>
                  )}
                  <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], true)} />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                  <input value={editForm.slug ?? ''} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))} className={inputCls} />
                </div>
                <button onClick={() => save(c.id)} className="p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditId(null)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                {/* Collection image thumbnail */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                  {c.imageUrl
                    ? <Image src={c.imageUrl} alt={c.name} width={48} height={48} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.slug} · {c._count.products} products</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.published ? 'Published' : 'Hidden'}
                </span>
                <button onClick={() => { setEditId(c.id); setEditForm({ name: c.name, slug: c.slug, imageUrl: c.imageUrl ?? '' }) }}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => del(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>

      {collections.length > 1 && (
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
          collections={collections}
          onClose={() => setShowReorder(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
