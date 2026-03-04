'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, X, User } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import BasketIcon from '@/components/BasketIcon'
import { useNavTransition } from '@/hooks/useNavTransition'

export default function Header() {
  const [user, setUser]           = useState<any>(null)
  const [userRole, setUserRole]   = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen]           = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef  = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const supabase = createClient()
  const router = useRouter()
  const { navigate, Overlay } = useNavTransition()

  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: customer } = await supabase
          .from('customers').select('role').eq('id', user.id).maybeSingle()
        setUserRole(customer?.role || null)
      }
    }
    fetchUserAndRole()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('customers').select('role').eq('id', session.user.id).maybeSingle()
          .then(({ data }) => setUserRole(data?.role || null))
      } else {
        setUserRole(null)
      }
    })
    return () => { authListener?.subscription.unsubscribe() }
  }, [supabase])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMenuOpen(false)
    setIsMobileMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  // Unified nav handler — closes menus then navigates with transition
  const handleNav = (href: string) => {
    setIsMenuOpen(false)
    setIsMobileMenuOpen(false)
    navigate(href)
  }

  const navLinks = [
    { href: '/',         label: 'Home',       active: pathname === '/'                   },
    { href: '/shop',     label: 'Shop',       active: !!pathname?.startsWith('/shop')    },
    { href: '/about',    label: 'About',      active: !!pathname?.startsWith('/about')   },
    { href: '/faq',      label: 'FAQ',        active: !!pathname?.startsWith('/faq')     },
    { href: '/baskets',  label: 'My Baskets', active: !!pathname?.startsWith('/baskets') },
    { href: '/contact',  label: 'Contact',    active: !!pathname?.startsWith('/contact') },
  ]

  return (
    <>
      <Overlay />

      <style>{`
        .rp-nav {
          position: relative;
          padding-bottom: 2px;
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .rp-nav::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 50%;
          width: 0; height: 2px;
          border-radius: 2px;
          background: linear-gradient(90deg, #B8860B, #D4AF37, #E3B347);
          transition: width 0.28s cubic-bezier(0.4,0,0.2,1), left 0.28s cubic-bezier(0.4,0,0.2,1);
        }
        .rp-nav:hover::after, .rp-nav-active::after { width: 100%; left: 0; }
        .rp-nav:hover      { color: #B8860B !important; transform: translateY(-1px); }
        .rp-nav-active     { color: #B8860B !important; font-weight: 600; }
        .rp-nav-active::before {
          content: '';
          position: absolute;
          inset: -5px -8px;
          background: radial-gradient(ellipse, rgba(184,134,11,0.1) 0%, transparent 70%);
          border-radius: 6px;
          pointer-events: none;
        }
        .rp-logo { transition: transform 0.25s ease, filter 0.25s ease; }
        .rp-logo:hover {
          transform: scale(1.04);
          filter: drop-shadow(0 0 8px rgba(212,175,55,0.5));
        }
        @keyframes rp-dropin {
          from { opacity: 0; transform: perspective(500px) rotateX(-6deg) translateY(-10px); }
          to   { opacity: 1; transform: perspective(500px) rotateX(0deg)  translateY(0px); }
        }
        .rp-mobile-menu { animation: rp-dropin 0.35s cubic-bezier(0.4,0,0.2,1) forwards; transform-origin: top center; }
        @keyframes rp-slidein {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .rp-mob-link { opacity: 0; animation: rp-slidein 0.25s ease forwards; transition: color 0.18s ease, padding-left 0.18s ease; }
        .rp-mob-link:nth-child(1)  { animation-delay: 0.04s; }
        .rp-mob-link:nth-child(2)  { animation-delay: 0.08s; }
        .rp-mob-link:nth-child(3)  { animation-delay: 0.12s; }
        .rp-mob-link:nth-child(4)  { animation-delay: 0.16s; }
        .rp-mob-link:nth-child(5)  { animation-delay: 0.20s; }
        .rp-mob-link:nth-child(6)  { animation-delay: 0.24s; }
        .rp-mob-link:nth-child(7)  { animation-delay: 0.28s; }
        .rp-mob-link:nth-child(8)  { animation-delay: 0.32s; }
        .rp-mob-link:nth-child(9)  { animation-delay: 0.36s; }
        .rp-mob-link:nth-child(10) { animation-delay: 0.40s; }
        .rp-mob-link:hover { color: #B8860B !important; padding-left: 4px; }
        .rp-mob-active     { color: #B8860B !important; font-weight: 600; }
      `}</style>

      <header className="bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">

            {/* Logo */}
            <button onClick={() => handleNav('/')} className="flex items-center space-x-2 group rp-logo">
              <div className="relative w-10 h-10">
                <Image src="/logo.png" alt="RP Apparels" fill className="object-contain" priority />
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white hidden sm:block">
                RP Apparels
              </span>
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center space-x-6">
              {navLinks.map(({ href, label, active }) => (
                <button
                  key={href}
                  onClick={() => handleNav(href)}
                  className={`rp-nav text-sm font-medium transition ${
                    active ? 'rp-nav-active text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
              {userRole === 'admin' && !isAdminRoute && (
                <button
                  onClick={() => handleNav('/admin')}
                  className="text-sm font-medium px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                >
                  Admin
                </button>
              )}
            </nav>

            {/* Right icons */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <BasketIcon />

              {/* Desktop user menu */}
              {user ? (
                <div className="relative hidden md:block" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-1 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1e1e1e] rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        {user.email}
                      </div>
                      <button onClick={() => handleNav('/profile')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                        Profile
                      </button>
                      {userRole === 'admin' && !isAdminRoute && (
                        <button onClick={() => handleNav('/admin')}
                          className="block w-full text-left px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                          Admin Dashboard
                        </button>
                      )}
                      {isAdminRoute && (
                        <button onClick={() => handleNav('/shop')}
                          className="block w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                          Back to Store
                        </button>
                      )}
                      <button onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-2">
                  <button onClick={() => handleNav('/login')}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#B8860B] dark:hover:text-[#D4AF37] transition">
                    Login
                  </button>
                  <button onClick={() => handleNav('/register')}
                    className="text-sm font-medium px-3 py-1 bg-[#1B5E20] text-white rounded hover:bg-[#2E7D32] transition">
                    Sign Up
                  </button>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {isMobileMenuOpen
                  ? <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                }
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-3 rp-mobile-menu">
              <div
                className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                style={{
                  background: 'rgba(255,253,250,0.95)',
                  backdropFilter: 'blur(18px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(150%)',
                }}
              >
                <div style={{ height: '2px', background: 'linear-gradient(90deg,#B8860B,#D4AF37,#E3B347,transparent)' }} />
                <nav className="flex flex-col space-y-0 px-4 py-2 dark:bg-[#161616]/95">
                  {navLinks.map(({ href, label, active }) => (
                    <button
                      key={href}
                      onClick={() => handleNav(href)}
                      className={`rp-mob-link w-full text-left text-sm font-medium py-3 border-b border-gray-100 dark:border-gray-800 ${
                        active ? 'rp-mob-active' : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}

                  {user ? (
                    <div className="rp-mob-link pt-3 border-t border-gray-200 dark:border-gray-700 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 pb-2">
                        Logged in as: {user.email}
                      </p>
                      <button onClick={() => handleNav('/profile')}
                        className="block w-full text-left text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-[#B8860B] py-2 transition">
                        Profile
                      </button>
                      {userRole === 'admin' && !isAdminRoute && (
                        <button onClick={() => handleNav('/admin')}
                          className="block w-full text-left text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 py-2 transition">
                          Admin Dashboard
                        </button>
                      )}
                      {isAdminRoute && (
                        <button onClick={() => handleNav('/shop')}
                          className="block w-full text-left text-sm font-medium text-[#B8860B] hover:text-[#D4AF37] py-2 transition">
                          Back to Store
                        </button>
                      )}
                      <button onClick={handleLogout}
                        className="block w-full text-left text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 py-2 transition">
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="rp-mob-link flex flex-col space-y-2 pt-3 pb-1">
                      <button onClick={() => handleNav('/login')}
                        className="text-sm font-semibold text-center py-2.5 rounded-lg border-2 border-[#D4AF37] text-[#B8860B] hover:bg-[#D4AF37]/10 transition">
                        Login
                      </button>
                      <button onClick={() => handleNav('/register')}
                        className="text-sm font-semibold text-center bg-[#1B5E20] text-white px-3 py-2.5 rounded-lg hover:bg-[#2E7D32] transition">
                        Sign up
                      </button>
                    </div>
                  )}
                </nav>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  )
}