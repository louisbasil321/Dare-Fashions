'use client'

import { useTransition, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// Derive the top-level "zone" from a pathname.
// /admin/baskets → "admin" | /shop?x=1 → "shop" | / → "home"
function getZone(path: string) {
  return path.split('?')[0].split('/')[1] || 'home'
}

export function useNavTransition() {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback((href: string) => {
    const isSameZone = getZone(pathname ?? '/') === getZone(href)

    // Same zone (e.g. /admin/x → /admin/y, /shop?a → /shop?b):
    //   loading.tsx won't fire here, so we use startTransition to get isPending
    //   and show our own overlay.
    //
    // Cross zone (e.g. /admin → /contact, /shop → /about):
    //   loading.tsx fires naturally — don't show our overlay too.
    if (isSameZone) {
      startTransition(() => router.push(href))
    } else {
      router.push(href)
    }
  }, [pathname, router])

  function Overlay() {
    if (!isPending) return null
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(8,6,4,0.75)',
          backdropFilter: 'blur(8px)',
          // 100ms delay: fast navigations never flash the spinner at all
          animation: 'nav-fadein 0.01s ease 0.1s both',
        }}
      >
        <style>{`@keyframes nav-fadein { from { opacity:0 } to { opacity:1 } }`}</style>
        <LoadingSpinner />
      </div>
    )
  }

  return { navigate, isPending, Overlay }
}