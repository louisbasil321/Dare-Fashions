'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useNavTransition } from '@/hooks/useNavTransition'

const navItems = [
  { href: '/admin',          label: 'Dashboard' },
  { href: '/admin/baskets',  label: 'Baskets'   },
  { href: '/admin/orders',   label: 'Orders'    },
  { href: '/admin/products', label: 'Products'  },
  { href: '/admin/users',    label: 'Users'     },
]

export default function AdminNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { navigate, Overlay } = useNavTransition()

  const handleNav = (href: string) => {
    setIsOpen(false)
    navigate(href)
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href)

  return (
    <>
      <Overlay />
      <nav className="bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-gray-800 sticky top-[73px] z-40">
        <div className="container mx-auto px-4">

          {/* Desktop */}
          <div className="hidden md:flex items-center space-x-1 py-3">
            {navItems.map(item => (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                className={`
                  relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive(item.href)
                    ? 'text-[#B8860B] dark:text-[#D4AF37] bg-[#D4AF37]/10'
                    : 'text-gray-700 dark:text-gray-300 hover:text-[#B8860B] dark:hover:text-[#D4AF37] hover:bg-[#D4AF37]/5'
                  }
                `}
              >
                {isActive(item.href) && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #B8860B, #D4AF37)' }}
                  />
                )}
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile header row */}
          <div className="md:hidden flex items-center justify-between py-3">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Admin —{' '}
              <span className="text-[#B8860B] dark:text-[#D4AF37]">
                {navItems.find(i => isActive(i.href))?.label ?? 'Menu'}
              </span>
            </span>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile dropdown */}
          {isOpen && (
            <div className="md:hidden pb-3 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className={`
                    w-full text-left block px-3 py-2.5 text-sm rounded-lg transition-all duration-150
                    ${isActive(item.href)
                      ? 'text-[#B8860B] dark:text-[#D4AF37] bg-[#D4AF37]/10 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </>
  )
}