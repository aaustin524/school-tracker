'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/helpers'

function NavLink({
  href,
  activeClass,
  inactiveClass,
  children,
}: {
  href: string
  activeClass: string
  inactiveClass: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = pathname === href
  return (
    <a
      href={href}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-black transition-colors',
        isActive ? activeClass : inactiveClass
      )}
    >
      {children}
    </a>
  )
}

export function NavClient() {
  const pathname = usePathname()
  const onUpload = pathname === '/upload' || pathname.startsWith('/upload/')
  return (
    <div className="flex items-center gap-1">
      <NavLink href="/" activeClass="bg-indigo-100 text-indigo-700" inactiveClass="text-indigo-600 hover:bg-indigo-50">
        🏠 Today
      </NavLink>
      <NavLink href="/emmett-austin" activeClass="bg-red-100 text-red-600" inactiveClass="text-red-500 hover:bg-red-50">
        ⭐ Emmett
      </NavLink>
      <NavLink href="/charlotte-austin" activeClass="bg-purple-100 text-purple-700" inactiveClass="text-purple-500 hover:bg-purple-50">
        ✨ Charlotte
      </NavLink>
      <NavLink href="/stats" activeClass="bg-indigo-100 text-indigo-700" inactiveClass="text-gray-500 hover:bg-gray-50">
        📊 Stats
      </NavLink>
      <a
        href="/upload"
        className={cn(
          'ml-2 rounded-full px-4 py-2 text-sm font-black text-white shadow-md hover:shadow-lg hover:scale-105 transition-all',
          onUpload
            ? 'bg-gradient-to-r from-pink-500 to-purple-600 scale-105 shadow-lg'
            : 'bg-gradient-to-r from-orange-400 to-pink-500'
        )}
      >
        📄 Upload
      </a>
    </div>
  )
}
