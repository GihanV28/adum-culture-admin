'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShoppingCart, Users, Package, TrendingUp } from 'lucide-react'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

interface Stats { totalOrders: number; todayOrders: number; totalRevenue: number; totalUsers: number; totalProducts: number; recentOrders: Order[] }
interface Order { id: string; customerName: string; total: number; status: string; paymentStatus: string; createdAt: string; ormOrderNumber?: string }

const statusColor: Record<string, string> = {
  open: 'bg-green-100 text-green-700', pending_payment: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700', fulfilled: 'bg-blue-100 text-blue-700',
}

function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-8">
      <Skeleton className="h-8 w-40 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-10">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <Skeleton className="h-5 w-32" />
        </div>
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 border-b border-gray-50 last:border-0">
              <Skeleton className="h-4 w-20 hidden sm:block" />
              <Skeleton className="h-4 w-28 flex-1" />
              <Skeleton className="h-4 w-16 hidden sm:block" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-20 hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    adminFetch('/api/dashboard').then(d => setStats(d.data)).catch(console.error)
  }, [])

  if (!stats) return <DashboardSkeleton />

  const cards = [
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
    { label: 'Orders Today', value: stats.todayOrders, icon: ShoppingCart, color: 'text-purple-600 bg-purple-50' },
    { label: 'Customers', value: stats.totalUsers, icon: Users, color: 'text-orange-600 bg-orange-50' },
    { label: 'Products', value: stats.totalProducts, icon: Package, color: 'text-gray-600 bg-gray-100' },
  ]

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead><tr className="border-b border-gray-100 text-left">
              <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Order</th>
              <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Customer</th>
              <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Total</th>
              <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500">Date</th>
            </tr></thead>
            <tbody>
              {stats.recentOrders.map(o => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-3 font-mono text-xs text-gray-600">{o.ormOrderNumber ?? o.id.slice(0, 8)}</td>
                  <td className="px-4 sm:px-6 py-3 font-medium">{o.customerName}</td>
                  <td className="px-4 sm:px-6 py-3">{formatCurrency(o.total)}</td>
                  <td className="px-4 sm:px-6 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span></td>
                  <td className="px-4 sm:px-6 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
