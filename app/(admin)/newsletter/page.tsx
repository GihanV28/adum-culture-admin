'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Download } from 'lucide-react'

interface Subscriber { id: string; email: string; subscribedAt: string }

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch('/api/newsletter').then(d => { setSubscribers(d.data.subscribers); setLoading(false) }).catch(console.error)
  }, [])

  const exportCsv = () => {
    const csv = ['Email,Subscribed At', ...subscribers.map(s => `${s.email},${s.subscribedAt}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'newsletter-subscribers.csv'; a.click()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
          <p className="text-sm text-gray-500 mt-1">{subscribers.length} subscribers</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? <div className="p-12 text-center text-gray-400 text-sm">Loading…</div> : subscribers.length === 0 ? <div className="p-12 text-center text-gray-400 text-sm">No subscribers yet.</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Email</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">Subscribed</th>
            </tr></thead>
            <tbody>
              {subscribers.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3">{s.email}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{formatDate(s.subscribedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
