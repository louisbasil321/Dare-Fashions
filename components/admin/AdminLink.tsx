'use client'

import { useTransition, ComponentPropsWithoutRef } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

type Props = ComponentPropsWithoutRef<'a'> & { href: string }

export default function AdminLink({ href, onClick, children, ...props }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <>
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(8,6,4,0.75)', backdropFilter: 'blur(8px)' }}>
          <LoadingSpinner />
        </div>
      )}
      <a
        href={href}
        onClick={e => {
          e.preventDefault()
          onClick?.(e)
          startTransition(() => router.push(href))
        }}
        {...props}
      >
        {children}
      </a>
    </>
  )
}