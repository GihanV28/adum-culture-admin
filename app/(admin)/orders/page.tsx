'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/api'
import { getCached, setCached, invalidateCache } from '@/lib/admin-cache'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface Order { id: string; customerName: string; customerPhone: string; customerEmail?: string; total: number; status: string; paymentStatus: string; createdAt: string; ormOrderNumber?: string; city: string }

const statusColor: Record<string, string> = { open: 'bg-green-100 text-green-700', pending_payment: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-red-100 text-red-700', fulfilled: 'bg-blue-100 text-blue-700', pending: 'bg-gray-100 text-gray-600' }
const payColor: Record<string, string> = { paid: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', failed: 'bg-red-100 text-red-700' }

function OrdersSkeleton() {
  return (
    <div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-0">
          <Skeleton className="h-4 w-20 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16 hidden md:block shrink-0" />
          <Skeleton className="h-4 w-20 hidden sm:block shrink-0" />
          <Skeleton className="h-6 w-16 rounded-full hidden sm:block shrink-0" />
          <Skeleton className="h-6 w-20 rounded shrink-0" />
          <Skeleton className="h-4 w-20 hidden lg:block shrink-0" />
        </div>
      ))}
    </div>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const cacheKey = `orders_${search}_${status}_${page}`

  const load = useCallback(async () => {
    const cached = getCached<{ orders: Order[]; pages: number }>(cacheKey)
    if (cached) { setOrders(cached.orders); setPages(cached.pages); setLoading(false); return }
    setLoading(true)
    const d = await adminFetch(`/api/orders?search=${search}&status=${status}&page=${page}`)
    const val = { orders: d.data.orders, pages: d.data.pages }
    setOrders(val.orders); setPages(val.pages)
    setCached(cacheKey, val, 60 * 1000) // 1 min TTL — orders change frequently
    setLoading(false)
  }, [search, status, page, cacheKey])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, newStatus: string) => {
    await adminFetch(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })
    invalidateCache(cacheKey); load()
  }

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Orders</h1>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input placeholder="Search name, phone, order #…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1 text-sm outline-none min-w-0" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none w-full sm:w-auto">
            <option value="">All Statuses</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="open">Open</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? <OrdersSkeleton /> : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead><tr className="border-b border-gray-100 text-left">
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Order</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Customer</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">City</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Payment</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Date</th>
              </tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3 font-mono text-xs">
                      <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">{o.ormOrderNumber ?? o.id.slice(0, 8)}</Link>
                    </td>
                    <td className="px-4 sm:px-6 py-3"><p className="font-medium">{o.customerName}</p><p className="text-xs text-gray-400">{o.customerPhone}</p></td>
                    <td className="px-4 sm:px-6 py-3 text-gray-500">{o.city}</td>
                    <td className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">{formatCurrency(o.total)}</td>
                    <td className="px-4 sm:px-6 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${payColor[o.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>{o.paymentStatus}</span></td>
                    <td className="px-4 sm:px-6 py-3">
                      <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                        className={`px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer ${statusColor[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        <option value="pending_payment">Pending Payment</option>
                        <option value="open">Open</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm gap-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 text-sm">Previous</button>
            <span className="text-gray-500 text-xs sm:text-sm">Page {page} of {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 text-sm">Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
