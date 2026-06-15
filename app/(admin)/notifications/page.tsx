'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { adminFetch } from '@/lib/api'
import { getCached, setCached, invalidateCache } from '@/lib/admin-cache'
import { formatDate } from '@/lib/utils'
import { Trash2, PackageX } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface StockAlertProduct {
  id: string
  name: string
  slug: string
  itemCode: string | null
  stock: number
  image: string | null
  updatedAt: string
}

interface RestockRequest {
  id: string
  productId: string
  productName: string
  productSlug: string
  size: string
  colorHex: string | null
  colorName: string | null
  customerName: string
  customerEmail: string
  status: string
  createdAt: string
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  notified: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
}

export default function NotificationsPage() {
  const [products, setProducts] = useState<StockAlertProduct[]>([])
  const [requests, setRequests] = useState<RestockRequest[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)

  const loadAlerts = () => {
    const cached = getCached<StockAlertProduct[]>('stock-alerts')
    if (cached) { setProducts(cached); setLoadingAlerts(false); return }
    setLoadingAlerts(true)
    adminFetch('/api/notifications/stock-alerts')
      .then(d => { const v = d.data.products; setProducts(v); setCached('stock-alerts', v, 2 * 60 * 1000); setLoadingAlerts(false) })
      .catch(() => setLoadingAlerts(false))
  }

  const loadRequests = () => {
    const cached = getCached<RestockRequest[]>('restock-requests')
    if (cached) { setRequests(cached); setLoadingRequests(false); return }
    setLoadingRequests(true)
    adminFetch('/api/notifications/restock-requests')
      .then(d => { const v = d.data.requests; setRequests(v); setCached('restock-requests', v, 2 * 60 * 1000); setLoadingRequests(false) })
      .catch(() => setLoadingRequests(false))
  }

  useEffect(() => { loadAlerts(); loadRequests() }, [])

  const setStatus = async (id: string, status: string) => {
    await adminFetch(`/api/notifications/restock-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    invalidateCache('restock-requests'); loadRequests()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this restock request?')) return
    await adminFetch(`/api/notifications/restock-requests/${id}`, { method: 'DELETE' })
    invalidateCache('restock-requests'); loadRequests()
  }

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Sold-out products and customer restock requests</p>
      </div>

      {/* ─── Stock Alerts ─── */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Stock Alerts</h2>
        <div className="bg-white rounded-xl border border-gray-200">
          {loadingAlerts ? (
            <div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-0">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24 shrink-0" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No sold-out products. 🎉</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead><tr className="border-b border-gray-100 text-left">
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Product</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Item Code</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Updated</th>
                </tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-3">
                        <Link href={`/products/${p.id}`} className="flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {p.image && <Image src={p.image} alt={p.name} fill className="object-cover" />}
                          </div>
                          <span className="font-medium text-gray-900 hover:underline">{p.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-gray-500">{p.itemCode ?? '—'}</td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          <PackageX className="w-3.5 h-3.5" /> Sold Out
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(p.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Restock Requests ─── */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Restock Requests</h2>
        <div className="bg-white rounded-xl border border-gray-200">
          {loadingRequests ? (
            <div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-0">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24 shrink-0" />
                  <Skeleton className="h-6 w-20 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No restock requests yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead><tr className="border-b border-gray-100 text-left">
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Customer</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Product</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Size</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Color</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Requested</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500"></th>
                </tr></thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-3">
                        <div className="font-medium text-gray-900">{r.customerName}</div>
                        <div className="text-xs text-gray-500">{r.customerEmail}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <Link href={`/products/${r.productId}`} className="hover:underline">{r.productName}</Link>
                      </td>
                      <td className="px-4 sm:px-6 py-3">{r.size}</td>
                      <td className="px-4 sm:px-6 py-3">
                        {r.colorHex ? (
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: r.colorHex }} />
                            <span className="text-gray-500 text-xs">{r.colorName ?? r.colorHex}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusStyles[r.status] ?? 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {r.status !== 'notified' && (
                            <button onClick={() => setStatus(r.id, 'notified')} className="px-2.5 py-1 rounded-lg text-xs border border-gray-300 hover:bg-gray-50 whitespace-nowrap">
                              Mark Notified
                            </button>
                          )}
                          {r.status !== 'dismissed' && (
                            <button onClick={() => setStatus(r.id, 'dismissed')} className="px-2.5 py-1 rounded-lg text-xs border border-gray-300 hover:bg-gray-50 whitespace-nowrap">
                              Dismiss
                            </button>
                          )}
                          <button onClick={() => del(r.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
    </div>
  )
}
