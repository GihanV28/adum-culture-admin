'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface Coupon { id: string; code: string; discountType: string; discountValue: number; minOrderValue: number; maxUses?: number; usedCount: number; active: boolean; expiresAt?: string; createdAt: string }

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: 10, minOrderValue: 0, maxUses: '', expiresAt: '', active: true })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    adminFetch('/api/coupons').then(d => { setCoupons(d.data.coupons); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    setSaving(true)
    await adminFetch('/api/coupons', { method: 'POST', body: JSON.stringify({ ...form, code: form.code.toUpperCase(), maxUses: form.maxUses ? +form.maxUses : undefined, expiresAt: form.expiresAt || undefined }) })
    setForm({ code: '', discountType: 'percentage', discountValue: 10, minOrderValue: 0, maxUses: '', expiresAt: '', active: true })
    load(); setSaving(false)
  }

  const toggle = async (c: Coupon) => {
    await adminFetch(`/api/coupons/${c.id}`, { method: 'PATCH', body: JSON.stringify({ active: !c.active }) })
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete coupon?')) return
    await adminFetch(`/api/coupons/${id}`, { method: 'DELETE' })
    load()
  }

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Coupons</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-900">New Coupon</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <input placeholder="Code (e.g. SAVE10)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputCls} />
          <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} className={inputCls}>
            <option value="percentage">Percentage %</option>
            <option value="fixed">Fixed Amount (LKR)</option>
          </select>
          <input type="number" placeholder="Discount value" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: +e.target.value }))} className={inputCls} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <input type="number" placeholder="Min order value" value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: +e.target.value }))} className={inputCls} />
          <input type="number" placeholder="Max uses (blank = unlimited)" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} className={inputCls} />
          <input type="date" placeholder="Expires at" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className={inputCls} />
        </div>
        <button onClick={create} disabled={!form.code || saving} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add Coupon
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-0">
                <Skeleton className="h-4 w-24 shrink-0" />
                <Skeleton className="h-4 w-20 hidden sm:block shrink-0" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-16 hidden md:block shrink-0" />
                <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No coupons yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead><tr className="border-b border-gray-100 text-left">
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Code</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Discount</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Used</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Expires</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500"></th>
              </tr></thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3 font-mono font-bold">{c.code}</td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{c.discountType === 'percentage' ? `${c.discountValue}%` : `LKR ${c.discountValue}`}</td>
                    <td className="px-4 sm:px-6 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                    <td className="px-4 sm:px-6 py-3 text-gray-500 text-xs whitespace-nowrap">{c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
                    <td className="px-4 sm:px-6 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => toggle(c)} className="text-gray-400 hover:text-gray-700">{c.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}</button>
                        <button onClick={() => del(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
