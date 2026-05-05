'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

interface OrderItem { name: string; quantity: number; price: number; size?: string; sku?: string }
interface Order { id: string; ormOrderNumber?: string; customerName: string; customerPhone: string; customerEmail?: string; shippingAddress: string; addressLine2?: string; city: string; district: string; postalCode?: string; paymentMethod: string; paymentStatus: string; status: string; subtotal: number; shippingCost: number; discount: number; total: number; items: OrderItem[]; customerNote?: string; createdAt: string; onePayTransactionId?: string }

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    adminFetch(`/api/orders/${params.id}`).then(d => setOrder(d.data.order)).catch(console.error)
  }, [params.id])

  const updateStatus = async (field: string, value: string) => {
    const d = await adminFetch(`/api/orders/${params.id}`, { method: 'PATCH', body: JSON.stringify({ [field]: value }) })
    setOrder(d.data.order)
  }

  if (!order) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="p-8">
      <button onClick={() => router.push('/orders')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.ormOrderNumber ?? order.id.slice(0, 8)}</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex gap-3">
          <select value={order.status} onChange={e => updateStatus('status', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="pending_payment">Pending Payment</option>
            <option value="open">Open</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={order.paymentStatus} onChange={e => updateStatus('paymentStatus', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="pending">Payment Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Customer</h2>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-sm text-gray-500">{order.customerPhone}</p>
            {order.customerEmail && <p className="text-sm text-gray-500">{order.customerEmail}</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Shipping Address</h2>
            <p className="text-sm">{order.shippingAddress}</p>
            {order.addressLine2 && <p className="text-sm">{order.addressLine2}</p>}
            <p className="text-sm">{order.city}, {order.district} {order.postalCode ?? ''}</p>
          </div>

          {order.customerNote && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Customer Note</h2>
              <p className="text-sm text-gray-600">{order.customerNote}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.size && `Size: ${item.size} · `}Qty: {item.quantity}</p>
                  </div>
                  <p>{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-4 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{formatCurrency(order.shippingCost)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="capitalize">{order.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="capitalize">{order.paymentStatus}</span></div>
              {order.onePayTransactionId && <div className="flex justify-between"><span className="text-gray-500">Transaction ID</span><span className="font-mono text-xs">{order.onePayTransactionId}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
