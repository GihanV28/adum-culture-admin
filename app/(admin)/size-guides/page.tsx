'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

type Row = { size: string; values: string[] }
type Guide = {
  id: string; name: string; note?: string; unit: string
  columns: string[]; rows: Row[]; _count: { products: number }
}

const DEFAULT_COLUMNS = ['Chest', 'Waist', 'Hips']
const DEFAULT_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']

function emptyForm() {
  return {
    name: '', note: '', unit: 'INCH' as 'CM' | 'INCH',
    columns: [...DEFAULT_COLUMNS],
    rows: DEFAULT_SIZES.slice(0, 5).map(s => ({ size: s, values: DEFAULT_COLUMNS.map(() => '') })),
  }
}

function ChartEditor({
  form, onChange
}: {
  form: ReturnType<typeof emptyForm>
  onChange: (f: ReturnType<typeof emptyForm>) => void
}) {
  const set = (patch: Partial<typeof form>) => onChange({ ...form, ...patch })

  const addColumn = () => {
    const col = `Column ${form.columns.length + 1}`
    set({
      columns: [...form.columns, col],
      rows: form.rows.map(r => ({ ...r, values: [...r.values, ''] })),
    })
  }

  const removeColumn = (ci: number) => {
    set({
      columns: form.columns.filter((_, i) => i !== ci),
      rows: form.rows.map(r => ({ ...r, values: r.values.filter((_, i) => i !== ci) })),
    })
  }

  const updateColumn = (ci: number, val: string) => {
    const cols = [...form.columns]; cols[ci] = val
    set({ columns: cols })
  }

  const addRow = () => {
    set({ rows: [...form.rows, { size: '', values: form.columns.map(() => '') }] })
  }

  const removeRow = (ri: number) => {
    set({ rows: form.rows.filter((_, i) => i !== ri) })
  }

  const updateCell = (ri: number, ci: number, val: string) => {
    const rows = form.rows.map((r, i) =>
      i === ri ? { ...r, values: r.values.map((v, j) => j === ci ? val : v) } : r
    )
    set({ rows })
  }

  const updateRowSize = (ri: number, val: string) => {
    const rows = form.rows.map((r, i) => i === ri ? { ...r, size: val } : r)
    set({ rows })
  }

  const inputCls = 'w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black'

  return (
    <div className="space-y-4">
      {/* Name + Note */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Chart Name *</label>
          <input value={form.name} onChange={e => set({ name: e.target.value })} className={inputCls} placeholder="e.g. Women's Tops" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Unit
            <span className="ml-1 font-normal text-gray-400">(FE auto-converts between CM ↔ INCH)</span>
          </label>
          <div className="flex gap-1">
            {(['CM', 'INCH'] as const).map(u => (
              <button key={u} onClick={() => set({ unit: u })}
                className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${form.unit === u ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Note <span className="text-gray-400 font-normal">(shown above chart)</span></label>
        <textarea value={form.note} onChange={e => set({ note: e.target.value })} rows={2} className={inputCls}
          placeholder="Sizes are based on the following body measurements. The measurements should be used as a guide." />
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 w-24">Size</th>
              {form.columns.map((col, ci) => (
                <th key={ci} className="border border-gray-200 px-2 py-1 min-w-[110px]">
                  <div className="flex items-center gap-1">
                    <input value={col} onChange={e => updateColumn(ci, e.target.value)}
                      className="flex-1 px-1 py-0.5 text-xs font-semibold text-gray-700 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-black" />
                    <button onClick={() => removeColumn(ci)} className="text-gray-300 hover:text-red-500 shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="border border-gray-200 px-2 py-1 w-10">
                <button onClick={addColumn} title="Add column"
                  className="w-full flex items-center justify-center text-gray-400 hover:text-black">
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {form.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50/50">
                <td className="border border-gray-200 px-2 py-1">
                  <input value={row.size} onChange={e => updateRowSize(ri, e.target.value)}
                    className="w-full px-1 py-0.5 text-xs font-semibold text-center bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-black" placeholder="XS" />
                </td>
                {row.values.map((val, ci) => (
                  <td key={ci} className="border border-gray-200 px-2 py-1 text-center">
                    <input value={val} onChange={e => updateCell(ri, ci, e.target.value)}
                      className="w-full px-1 py-0.5 text-xs text-center bg-transparent focus:outline-none border-b border-dashed border-transparent focus:border-gray-400" placeholder="-" />
                  </td>
                ))}
                <td className="border border-gray-200 px-2 py-1 text-center">
                  <button onClick={() => removeRow(ri)} className="text-gray-300 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black border border-dashed border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded transition-colors">
        <Plus className="w-3 h-3" /> Add row
      </button>
    </div>
  )
}

function ChartPreview({ guide }: { guide: Guide }) {
  const columns = guide.columns as string[]
  const rows = guide.rows as Row[]
  return (
    <div className="overflow-x-auto">
      {guide.note && <p className="text-xs text-gray-500 mb-2 italic">{guide.note}</p>}
      <div className="flex gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 bg-gray-100 rounded text-gray-600">{guide.unit}</span>
        <span className="text-xs text-gray-400">(auto-converts CM ↔ INCH in storefront)</span>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-3 py-1.5 text-left font-semibold text-gray-700">Size</th>
            {columns.map((c, i) => <th key={i} className="border border-gray-200 px-3 py-1.5 text-center font-semibold text-gray-700">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              <td className="border border-gray-200 px-3 py-1.5 font-semibold text-gray-800">{r.size}</td>
              {r.values.map((v, j) => <td key={j} className="border border-gray-200 px-3 py-1.5 text-center text-gray-600">{v || '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SizeGuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const d = await adminFetch('/api/size-guides').catch(() => null)
    if (d) setGuides(d.data.guides)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!newForm.name.trim()) return
    setSaving(true)
    await adminFetch('/api/size-guides', { method: 'POST', body: JSON.stringify(newForm) })
    setCreating(false); setNewForm(emptyForm()); load()
    setSaving(false)
  }

  const saveEdit = async () => {
    if (!editId || !editForm.name.trim()) return
    setSaving(true)
    await adminFetch(`/api/size-guides/${editId}`, { method: 'PUT', body: JSON.stringify(editForm) })
    setEditId(null); load()
    setSaving(false)
  }

  const startEdit = (g: Guide) => {
    setEditId(g.id)
    setExpanded(g.id)
    setEditForm({
      name: g.name, note: g.note ?? '', unit: (g.unit === 'CM' ? 'CM' : 'INCH') as 'CM' | 'INCH',
      columns: g.columns as string[],
      rows: g.rows as Row[],
    })
  }

  const del = async (id: string) => {
    if (!confirm('Delete this size guide? Products using it will lose the association.')) return
    await adminFetch(`/api/size-guides/${id}`, { method: 'DELETE' }); load()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Size Guides</h1>
          <p className="text-sm text-gray-500 mt-1">Build size charts to attach to products</p>
        </div>
        {!creating && (
          <button onClick={() => { setCreating(true); setNewForm(emptyForm()) }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 shrink-0">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Size Guide</span><span className="sm:hidden">New</span>
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">New Size Guide</h2>
            <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
          </div>
          <ChartEditor form={newForm} onChange={setNewForm} />
          <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
            <button onClick={create} disabled={saving || !newForm.name.trim()}
              className="px-5 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Size Guide'}
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))
        ) : guides.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No size guides yet. Create one to get started.
          </div>
        ) : guides.map(g => (
          <div key={g.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 px-4 sm:px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{g.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {g.unit} · {(g.columns as string[]).join(', ')} · {(g.rows as Row[]).length} sizes · {g._count.products} product{g._count.products !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editId === g.id ? (
                  <>
                    <button onClick={saveEdit} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50">
                      <Check className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditId(null); setExpanded(null) }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(g)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del(g.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
                <button onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                  {expanded === g.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Expanded: edit or preview */}
            {expanded === g.id && (
              <div className="px-4 sm:px-6 pb-6 border-t border-gray-100 pt-5">
                {editId === g.id
                  ? <ChartEditor form={editForm} onChange={setEditForm} />
                  : <ChartPreview guide={g} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
