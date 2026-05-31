'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, FolderOpen, ShoppingCart, Users, Tag, Mail, FileText, LogOut, Calculator, Image, Layers, Ruler, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clearAdminCache } from '@/lib/admin-cache'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories', icon: Layers },
  { href: '/collections', label: 'Collections', icon: FolderOpen },
  { href: '/size-guides', label: 'Size Guide', icon: Ruler },
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
  const [open, setOpen] = useState(false)

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('admin_token')
    clearAdminCache()
    router.push('/login')
  }

  const navContent = (
    <>
      <div className="px-4 py-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center shrink-0">
            <span className="text-black font-bold text-xs">AC</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Adum Culture</p>
            <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden p-1 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
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
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-gray-900 text-white flex items-center justify-between px-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center shrink-0">
            <span className="text-black font-bold text-xs">AC</span>
          </div>
          <span className="text-sm font-semibold">Adum Culture</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-1 text-gray-400 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed md:relative inset-y-0 left-0 z-50 w-56 shrink-0 bg-gray-900 text-white min-h-screen flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        {navContent}
      </aside>
    </>
  )
}
