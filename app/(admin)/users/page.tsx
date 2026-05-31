'use client'
import { useEffect, useState, useCallback } from 'react'
import { adminFetch } from '@/lib/api'
import { getCached, setCached, invalidateCache } from '@/lib/admin-cache'
import { formatDate } from '@/lib/utils'
import { Search, CheckCircle2, XCircle, Trash2, ShieldOff, ShieldCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  emailVerified: boolean
  suspended: boolean
  createdAt: string
  _count: { orders: number }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!search) {
      const cached = getCached<User[]>('users')
      if (cached) { setUsers(cached); setLoading(false); return }
    }
    setLoading(true)
    const d = await adminFetch(`/api/users?search=${search}`)
    const us = d.data.users
    setUsers(us)
    if (!search) setCached('users', us)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSuspend = async (user: User) => {
    setActionLoading(user.id + '-suspend')
    try {
      await adminFetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ suspended: !user.suspended }),
      })
      invalidateCache('users'); setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended: !u.suspended } : u))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (user: User) => {
    setActionLoading(user.id + '-delete')
    try {
      await adminFetch(`/api/users/${user.id}`, { method: 'DELETE' })
      invalidateCache('users'); setUsers(prev => prev.filter(u => u.id !== user.id))
    } finally {
      setActionLoading(null)
      setConfirmDelete(null)
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Customers</h1>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            placeholder="Search customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none"
          />
        </div>

        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-0">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-24 hidden sm:block shrink-0" />
                <Skeleton className="h-4 w-4 rounded-full hidden md:block shrink-0" />
                <Skeleton className="h-4 w-8 hidden md:block shrink-0" />
                <Skeleton className="h-4 w-20 hidden lg:block shrink-0" />
                <Skeleton className="h-7 w-20 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Customer</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Phone</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Verified</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Orders</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Joined</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 ${u.suspended ? 'opacity-60' : ''}`}>
                    <td className="px-4 sm:px-6 py-3">
                      <p className="font-medium flex items-center gap-2">
                        {u.name}
                        {u.suspended && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                            Suspended
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-gray-500">{u.phone ?? '—'}</td>
                    <td className="px-4 sm:px-6 py-3">
                      {u.emailVerified
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-gray-300" />}
                    </td>
                    <td className="px-4 sm:px-6 py-3">{u._count.orders}</td>
                    <td className="px-4 sm:px-6 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSuspend(u)}
                          disabled={actionLoading === u.id + '-suspend'}
                          title={u.suspended ? 'Unsuspend' : 'Suspend'}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
                            u.suspended
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {u.suspended
                            ? <><ShieldCheck className="w-3.5 h-3.5" /> Unsuspend</>
                            : <><ShieldOff className="w-3.5 h-3.5" /> Suspend</>}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(u)}
                          disabled={!!actionLoading}
                          title="Delete permanently"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">No customers found.</p>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-center mb-1">Delete Customer?</h2>
            <p className="text-sm text-gray-500 text-center mb-1">
              <span className="font-medium text-gray-800">{confirmDelete.name}</span>
            </p>
            <p className="text-sm text-gray-500 text-center mb-6">
              This is permanent and cannot be undone. All their data will be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={!!actionLoading}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={actionLoading === confirmDelete.id + '-delete'}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {actionLoading === confirmDelete.id + '-delete' ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
