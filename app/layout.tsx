import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Adum Culture Admin', description: 'Admin Panel' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
