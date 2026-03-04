'use client'

import { Product } from '@/lib/types'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createBasket } from '@/actions/basket'
import { ShoppingCart, Eye, Check, Sparkles } from 'lucide-react'
import { isProductNew } from '@/lib/utils'
import { motion } from 'framer-motion'

// ── BasketBtn extracted OUTSIDE ProductCard to prevent remount on every render ──
interface BasketBtnProps {
  product: Product
  isInBasket: boolean
  loading: boolean
  showSuccess: boolean
  onAdd: () => void
}

function BasketBtn({ product, isInBasket, loading, showSuccess, onAdd }: BasketBtnProps) {
  // Already in basket — gold static check
  if (isInBasket) {
    return (
      <div
        title="Already in your basket"
        className="relative flex items-center justify-center w-12 h-12 rounded-full text-gray-900 flex-shrink-0 select-none"
        style={{
          backgroundColor: '#D4AF37',
          background: 'linear-gradient(135deg, #EDD060 0%, #D4AF37 45%, #A88520 100%)',
          boxShadow: '0 0 0 2px rgba(212,175,55,0.25), 0 0 16px rgba(212,175,55,0.45)',
        }}
      >
        <span className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.36) 0%, transparent 54%)' }} />
        <Check className="relative z-10 w-5 h-5 drop-shadow-sm" strokeWidth={2.5} />
      </div>
    )
  }

  // Success — green pulse
  if (showSuccess) {
    return (
      <div
        className="relative flex items-center justify-center w-12 h-12 rounded-full text-white flex-shrink-0"
        style={{
           backgroundColor: '#D4AF37',
          background: 'linear-gradient(135deg, #4ade80 0%, #16a34a 55%, #15803d 100%)',
          boxShadow: '0 0 0 2px rgba(74,222,128,0.25), 0 0 20px rgba(74,222,128,0.55)',
        }}
      >
        <span className="absolute inset-0 rounded-full border-2 border-green-400/60 animate-ping"
              style={{ animationDuration: '1s' }} />
        <span className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.28) 0%, transparent 54%)' }} />
        <Check className="relative z-10 w-5 h-5 drop-shadow-sm" strokeWidth={2.5} />
      </div>
    )
  }

  // Out of stock — muted
  if (product.available === 0) {
    return (
      <div
        title="Out of stock"
        className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed flex-shrink-0"
      >
        <ShoppingCart className="w-5 h-5" />
      </div>
    )
  }

  // Active gold button
  return (
    <button
      onClick={onAdd}
      disabled={loading}
      title="Add to basket"
      className="
        group/btn relative flex items-center justify-center
        w-12 h-12 rounded-full text-gray-900 flex-shrink-0
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        hover:-translate-y-1.5 hover:scale-110
        active:scale-90 active:translate-y-0
        focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60
        focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#191919]
      "
      style={{
        background: 'linear-gradient(135deg, #EDD060 0%, #D4AF37 45%, #A88520 100%)',
        boxShadow: '0 0 0 2px rgba(212,175,55,0.20), 0 0 18px rgba(212,175,55,0.48), 0 3px 10px rgba(0,0,0,0.15)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 0 0 3px rgba(212,175,55,0.38), 0 0 32px rgba(212,175,55,0.68), 0 6px 18px rgba(0,0,0,0.20)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 0 0 2px rgba(212,175,55,0.20), 0 0 18px rgba(212,175,55,0.48), 0 3px 10px rgba(0,0,0,0.15)'
      }}
    >
      {/* Specular sheen */}
      <span className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.38) 0%, transparent 52%, rgba(0,0,0,0.07) 100%)' }} />

      {/* Shimmer on hover */}
      <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent
                         -translate-x-full group-hover/btn:animate-[goldShimmer_0.7s_ease_forwards]" />
      </span>

      {/* Ping ring 1 */}
      <span
        className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/65
                   opacity-0 group-hover/btn:opacity-100 group-hover/btn:animate-ping pointer-events-none"
        style={{ animationDuration: '0.85s' }}
      />
      {/* Ping ring 2 — offset */}
      <span
        className="absolute -inset-[3px] rounded-full border border-[#D4AF37]/35
                   opacity-0 group-hover/btn:opacity-100 group-hover/btn:animate-ping pointer-events-none"
        style={{ animationDuration: '0.85s', animationDelay: '0.15s' }}
      />

      <ShoppingCart
        className={`relative z-10 w-5 h-5 drop-shadow-sm transition-all duration-500
          ${loading ? 'animate-spin' : 'group-hover/btn:scale-110 group-hover/btn:-rotate-6'}`}
      />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductCard({
  product,
  isInBasket = false,
}: {
  product: Product
  isInBasket?: boolean
}) {
  const [quantity]                    = useState(1)
  const [loading,     setLoading]     = useState(false)
  const [isHovered,   setIsHovered]   = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleAddToBasket = async () => {
    setLoading(true)
    try {
      await createBasket(product.id, quantity)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const motionProps = {
    initial:     { opacity: 0, y: 20 },
    whileInView: { opacity: 1,  y: 0  },
    viewport:    { once: true, amount: 0.2 },
    transition:  { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <>
      <motion.div
        
        className="group relative rounded-2xl overflow-hidden
                   bg-white dark:bg-[#191919]
                   border border-gray-100 dark:border-[#2a2a2a]
                   hover:border-[#D4AF37]/60 dark:hover:border-[#D4AF37]/50
                   transition-all duration-300
                   hover:shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.50)]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ── Media ──────────────────────────────────────────────────────── */}
        <Link
          href={`/product/${product.id}`}
          className="block relative overflow-hidden bg-gray-50 dark:bg-[#141414]"
          style={{ aspectRatio: '4/5' }}
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : product.video_url ? (
            <video
              src={product.video_url}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              autoPlay muted loop playsInline controls={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
              <ShoppingCart className="w-10 h-10 opacity-25" />
            </div>
          )}

          {/* Bottom gradient veil on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

          {/* Quick View pill */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full
                            bg-black/60 backdrop-blur-sm
                            text-white text-xs font-semibold tracking-wide
                            border border-white/20 shadow-lg">
              <Eye className="w-3.5 h-3.5" />
              Quick View
            </div>
          </div>

          {/* NEW badge */}
          {isProductNew(product.created_at) && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1
                            rounded-full bg-[#7A1E2C] text-white text-[11px] font-bold
                            tracking-wider uppercase shadow-lg">
              <Sparkles className="w-3 h-3" />
              New
            </div>
          )}

          {/* Availability badges */}
          {product.available <= 5 && product.available > 0 && (
            <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full
                            bg-orange-500/90 backdrop-blur-sm text-white text-[11px] font-bold shadow-md">
              Only {product.available} left!
            </div>
          )}
          {product.available === 0 && (
            <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full
                            bg-gray-900/80 backdrop-blur-sm text-gray-300 text-[11px] font-bold">
              Out of Stock
            </div>
          )}
        </Link>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="p-4">
          <Link href={`/product/${product.id}`}>
            <h3 className="font-semibold text-[15px] leading-snug mb-1
                           text-gray-900 dark:text-white
                           hover:text-[#D4AF37] dark:hover:text-[#E3B347]
                           transition-colors duration-200 line-clamp-1">
              {product.name}
            </h3>
          </Link>

          <p className="text-[13px] text-gray-500 dark:text-gray-500 line-clamp-2 leading-relaxed mb-3">
            {product.description}
          </p>

          <div className="flex items-center justify-between mt-4">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                ₦{product.price.toLocaleString()}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {product.available} avail.
              </span>
            </div>

            <BasketBtn
              product={product}
              isInBasket={isInBasket}
              loading={loading}
              showSuccess={showSuccess}
              onAdd={handleAddToBasket}
            />
          </div>
        </div>

        {/* Gold bottom accent line on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]
                        bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent
                        scale-x-0 group-hover:scale-x-100
                        transition-transform duration-500 ease-out origin-center" />
      </motion.div>

      <style>{`
        @keyframes goldShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%);  }
        }
      `}</style>
    </>
  )
}
