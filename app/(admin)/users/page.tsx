'use client'
import { useEffect, useState, useCallback } from 'react'
import { adminFetch } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Search, CheckCircle2, XCircle } from 'lucide-react'

interface User { id: string; name: string; email: string; phone?: string; emailVerified: boolean; createdAt: string; _count: { orders: number } }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const d = await adminFetch(`/api/users?search=${search}`)
    setUsers(d.data.users); setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Customers</h1>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm outline-none" />
        </div>
        {loading ? <div className="p-12 text-center text-gray-400 text-sm">Loading…</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Customer</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Phone</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Verified</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Orders</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Joined</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></td>
                  <td className="px-6 py-3 text-gray-500">{u.phone ?? '—'}</td>
                  <td className="px-6 py-3">{u.emailVerified ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}</td>
                  <td className="px-6 py-3">{u._count.orders}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
