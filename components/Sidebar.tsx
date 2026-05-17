'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, FolderOpen, ShoppingCart, Users, Tag, Mail, FileText, LogOut, Calculator, Image, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories', icon: Layers },
  { href: '/collections', label: 'Collections', icon: FolderOpen },
  { href: '/hero-slides', label: 'Hero Slides', icon: Image },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/users', label: 'Customers', icon: Users },
  { href: '/coupons', label: 'Coupons', icon: Tag },
  { href: '/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/content', label: 'Page Content', icon: FileText },
  { href: '/cost-calculator', label: 'Cost Calculator', icon: Calculator },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('admin_token')
    router.push('/login')
  }

  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
            <span className="text-black font-bold text-xs">AC</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Adum Culture</p>
            <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active ? 'bg-white text-gray-900 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-4 border-t border-gray-800">
        <button onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  )
}
