'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const PRICE_BRACKETS = [
  { label: 'Under ₦10k',   min: 0,     max: 10000 },
  { label: '₦10k – ₦30k', min: 10000, max: 30000  },
  { label: '₦30k – ₦50k', min: 30000, max: 50000  },
  { label: 'Over ₦50k',   min: 50000, max: null   },
]

const inputCls = [
  'w-full border border-[#2e2b27] bg-[#1a1714] text-gray-100 rounded-xl',
  'px-4 py-2.5 text-sm placeholder:text-[#5a5550]',
  'focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]',
  'hover:border-[#3e3b37] transition-colors duration-200',
].join(' ')

const selectCls = [
  'w-full border border-[#2e2b27] bg-[#1a1714] text-gray-100 rounded-xl',
  'px-4 py-2.5 pr-9 text-sm appearance-none cursor-pointer',
  'focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]',
  'hover:border-[#3e3b37] transition-colors duration-200',
].join(' ')

const numberCls = [
  'w-28 border border-[#2e2b27] bg-[#1a1714] text-gray-100 rounded-xl',
  'px-3 py-2.5 text-sm placeholder:text-[#5a5550]',
  'focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]',
  'hover:border-[#3e3b37] transition-colors duration-200',
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
].join(' ')

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150
        ${active
          ? 'bg-[#D4AF37] border-[#D4AF37] text-gray-900 shadow-[0_0_10px_rgba(212,175,55,0.35)]'
          : 'bg-transparent border-[#2e2b27] text-gray-400 hover:border-[#D4AF37]/60 hover:text-gray-200'
        }
      `}
    >
      {label}
    </button>
  )
}

function FilterSection({
  title, items, selected, onToggle,
}: {
  title: string; items: string[]; selected: string[]; onToggle: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  if (!items || items.length === 0) return null
  return (
    <div className="border-t border-[#1e1e1e] pt-4">
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full mb-2 group">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.12em]">{title}</span>
          {selected.length > 0 && (
            <span className="px-1.5 py-0.5 bg-[#D4AF37] text-gray-900 text-[10px] font-bold rounded-full">{selected.length}</span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300 transition-colors" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300 transition-colors" />
        }
      </button>
      {!open && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {selected.map(val => <Chip key={val} label={val} active onClick={() => onToggle(val)} />)}
        </div>
      )}
      {open && (
        <div className="flex flex-wrap gap-1.5">
          {items.map(val => (
            <Chip key={val} label={val} active={selected.includes(val)} onClick={() => onToggle(val)} />
          ))}
        </div>
      )}
    </div>
  )
}

interface PanelProps {
  search: string;       setSearch:      (v: string)   => void
  sex: string;          setSex:         (v: string)   => void
  sort: string;         setSort:        (v: string)   => void
  newArrivals: boolean; setNewArrivals: (v: boolean)  => void
  minPrice: string;     setMinPrice:    (v: string)   => void
  maxPrice: string;     setMaxPrice:    (v: string)   => void
  colors: string[];     setColors:      (v: string[]) => void
  materials: string[];  setMaterials:   (v: string[]) => void
  patterns: string[];   setPatterns:    (v: string[]) => void
  categories: string[]; setCategories:  (v: string[]) => void
  occasions: string[];  setOccasions:   (v: string[]) => void
  sizes: string[];      setSizes:       (v: string[]) => void
  options: Record<string, string[]>
  activeCount: number
  isPending: boolean   // ← from useTransition
  onClose:         () => void
  onApply:         () => void
  onReset:         () => void
  setPriceBracket: (min: number | null, max: number | null) => void
  moreFiltersOpen: boolean
  setMoreFiltersOpen: (v: boolean) => void
}

interface ProductSearchAndFiltersProps {
  filterOptions?: Record<string, string[]>
}

function FilterPanelContent({
  search, setSearch, sex, setSex, sort, setSort,
  newArrivals, setNewArrivals, minPrice, setMinPrice, maxPrice, setMaxPrice,
  colors, setColors, materials, setMaterials, patterns, setPatterns,
  categories, setCategories, occasions, setOccasions, sizes, setSizes,
  options, activeCount, isPending,
  onClose, onApply, onReset, setPriceBracket,
  moreFiltersOpen, setMoreFiltersOpen,
}: PanelProps) {
  const toggle = (arr: string[], val: string, setter: (v: string[]) => void) =>
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])

  const hasKeywordOptions = ['colors','materials','patterns','categories','occasions','sizes']
    .some(k => options[k]?.length > 0)

  return (
    // flex col so footer is always pinned — only the body scrolls
    <div className="bg-[#111] rounded-2xl overflow-hidden shadow-2xl border border-[#252525] w-full flex flex-col" style={{ maxHeight: '75vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.10) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-bold text-white text-sm tracking-widest uppercase">Refine Results</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-[#7A1E2C] text-white text-[11px] font-bold rounded-full">{activeCount} active</span>
          )}
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">

        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className={inputCls} />
          <div className="relative">
            <select value={sex} onChange={e => setSex(e.target.value)} className={selectCls}>
              <option value="">All Genders</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={sort} onChange={e => setSort(e.target.value)} className={selectCls}>
              <option value="">Default Sort</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#2e2b27] bg-[#1a1714] cursor-pointer hover:border-[#D4AF37] transition-colors select-none">
            <div className="relative w-9 h-5 flex-shrink-0">
              <input type="checkbox" checked={newArrivals} onChange={e => setNewArrivals(e.target.checked)} className="sr-only" />
              <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${newArrivals ? 'bg-[#D4AF37]' : 'bg-[#333]'}`} />
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${newArrivals ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-white font-medium">New Arrivals</span>
          </label>
        </div>

        {/* Price range */}
        <div className="pt-4 border-t border-[#1e1e1e]">
          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-3">Price Range (₦)</p>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min" className={numberCls} />
              <span className="text-gray-700 text-lg font-light select-none">—</span>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max" className={numberCls} />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRICE_BRACKETS.map(bracket => {
                const isActive = minPrice === (bracket.min?.toString() ?? '') && maxPrice === (bracket.max?.toString() ?? '')
                return (
                  <button key={bracket.label}
                    onClick={() => setPriceBracket(bracket.min, bracket.max)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                      isActive
                        ? 'bg-[#D4AF37] border-[#D4AF37] text-gray-900 shadow-[0_0_14px_rgba(212,175,55,0.45)]'
                        : 'bg-transparent border-[#2e2e2e] text-gray-500 hover:border-[#D4AF37] hover:text-[#D4AF37]'
                    }`}
                  >
                    {bracket.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* More filters */}
        {hasKeywordOptions && (
          <div className="pt-2 border-t border-[#1e1e1e]">
            <button
              onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-1"
            >
              <span className="uppercase tracking-wider text-[11px]">More Filters</span>
              {[...colors,...materials,...patterns,...categories,...occasions,...sizes].length > 0 && (
                <span className="px-1.5 py-0.5 bg-[#7A1E2C] text-white text-[10px] font-bold rounded-full">
                  {[colors,materials,patterns,categories,occasions,sizes].filter(a => a.length > 0).length} groups active
                </span>
              )}
              {moreFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {moreFiltersOpen && (
              <div className="space-y-1 mt-3">
                <FilterSection title="Categories" items={options.categories || []} selected={categories} onToggle={v => toggle(categories, v, setCategories)} />
                <FilterSection title="Colors"     items={options.colors     || []} selected={colors}     onToggle={v => toggle(colors,     v, setColors)}     />
                <FilterSection title="Sizes"      items={options.sizes      || []} selected={sizes}      onToggle={v => toggle(sizes,      v, setSizes)}      />
                <FilterSection title="Materials"  items={options.materials  || []} selected={materials}  onToggle={v => toggle(materials,  v, setMaterials)}  />
                <FilterSection title="Patterns"   items={options.patterns   || []} selected={patterns}   onToggle={v => toggle(patterns,   v, setPatterns)}   />
                <FilterSection title="Occasions"  items={options.occasions  || []} selected={occasions}  onToggle={v => toggle(occasions,  v, setOccasions)}  />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky footer — flex-shrink-0 so it NEVER scrolls away ── */}
      <div className="flex gap-3 justify-end px-6 py-4 border-t border-[#1e1e1e] flex-shrink-0 bg-[#111]">
        <button
          onClick={onReset}
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-medium rounded-xl bg-[#1a1a1a] border border-[#2e2e2e] text-gray-400 hover:bg-[#222] hover:text-white hover:border-[#444] transition-colors disabled:opacity-40"
        >
          Reset
        </button>
        <button
          onClick={onApply}
          disabled={isPending}
          className="group relative px-8 py-2.5 text-sm font-bold rounded-xl overflow-hidden text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_20px_rgba(122,30,44,0.4)] disabled:opacity-70 disabled:cursor-wait min-w-[120px]"
          style={{ background: 'linear-gradient(135deg, #9A2E40 0%, #7A1E2C 100%)' }}
        >
          {!isPending && (
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
          )}
          {isPending ? (
            // Mini inline spinner while transition is pending
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="relative inline-flex w-4 h-4 flex-shrink-0">
                <span className="absolute inset-0 rounded-full border-2 border-white/20" />
                <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#D4AF37]"
                  style={{ animation: 'spin 0.7s linear infinite' }} />
              </span>
              <span>Applying…</span>
            </span>
          ) : (
            <span className="relative z-10">Apply</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default function ProductSearchAndFilters({ filterOptions = {} }: ProductSearchAndFiltersProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // ── useTransition: isPending = true the entire time the new page is fetching ──
  // This is the CORRECT way to show loading during router.push in Next.js App Router.
  // loading.tsx does NOT fire for same-route-group navigations (confirmed Next.js bug).
  // useTransition works because router.push is integrated with React's scheduler.
  const [isPending, startTransition] = useTransition()

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [search,       setSearch]       = useState(searchParams.get('q')        || '')
  const [sex,          setSex]          = useState(searchParams.get('sex')      || '')
  const [sort,         setSort]         = useState(searchParams.get('sort')     || '')
  const [newArrivals,  setNewArrivals]  = useState(searchParams.get('new') === 'true')
  const [minPrice,     setMinPrice]     = useState(searchParams.get('minPrice') || '')
  const [maxPrice,     setMaxPrice]     = useState(searchParams.get('maxPrice') || '')
  const [colors,     setColors]     = useState<string[]>(searchParams.get('colors')?.split(',').filter(Boolean)     || [])
  const [materials,  setMaterials]  = useState<string[]>(searchParams.get('materials')?.split(',').filter(Boolean)  || [])
  const [patterns,   setPatterns]   = useState<string[]>(searchParams.get('patterns')?.split(',').filter(Boolean)   || [])
  const [categories, setCategories] = useState<string[]>(searchParams.get('categories')?.split(',').filter(Boolean) || [])
  const [occasions,  setOccasions]  = useState<string[]>(searchParams.get('occasions')?.split(',').filter(Boolean)  || [])
  const [sizes,      setSizes]      = useState<string[]>(searchParams.get('sizes')?.split(',').filter(Boolean)      || [])
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [isFloating,      setIsFloating]      = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)

  // IntersectionObserver: rock-solid floating detection, no scroll event races
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nowFloating = !entry.isIntersecting
        setIsFloating(nowFloating)
        if (!nowFloating) setIsFilterOpen(false)
      },
      { threshold: 0, rootMargin: '-72px 0px 0px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = isFilterOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isFilterOpen])

  const activeCount = [
    search, sex, sort,
    newArrivals ? 'y' : '',
    minPrice || maxPrice ? 'y' : '',
    ...colors, ...materials, ...patterns, ...categories, ...occasions, ...sizes,
  ].reduce((acc, v, i) => {
    // Count groups, not individual items
    if (i === 0) return v ? acc + 1 : acc           // search
    if (i === 1) return v ? acc + 1 : acc           // sex
    if (i === 2) return v ? acc + 1 : acc           // sort
    if (i === 3) return v ? acc + 1 : acc           // newArrivals
    if (i === 4) return v ? acc + 1 : acc           // price
    return acc
  }, 0) + [colors, materials, patterns, categories, occasions, sizes].filter(a => a.length > 0).length

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (search)           params.set('q',          search)
    if (sex)              params.set('sex',         sex)
    if (sort)             params.set('sort',        sort)
    if (newArrivals)      params.set('new',         'true')
    if (minPrice)         params.set('minPrice',    minPrice)
    if (maxPrice)         params.set('maxPrice',    maxPrice)
    if (colors.length)     params.set('colors',     colors.join(','))
    if (materials.length)  params.set('materials',  materials.join(','))
    if (patterns.length)   params.set('patterns',   patterns.join(','))
    if (categories.length) params.set('categories', categories.join(','))
    if (occasions.length)  params.set('occasions',  occasions.join(','))
    if (sizes.length)      params.set('sizes',      sizes.join(','))

    setIsFilterOpen(false)

    // Wrap router.push in startTransition — isPending stays true until
    // the shop page finishes fetching, giving us a real loading state
    startTransition(() => {
      router.push(`/shop?${params.toString()}`)
    })
  }, [search, sex, sort, newArrivals, minPrice, maxPrice, colors, materials, patterns, categories, occasions, sizes, router, startTransition])

  const resetFilters = useCallback(() => {
    setSearch(''); setSex(''); setSort(''); setNewArrivals(false)
    setMinPrice(''); setMaxPrice('')
    setColors([]); setMaterials([]); setPatterns([])
    setCategories([]); setOccasions([]); setSizes([])
    setIsFilterOpen(false)
    startTransition(() => { router.push('/shop') })
  }, [router, startTransition])

  const panelProps: PanelProps = {
    search, setSearch, sex, setSex, sort, setSort,
    newArrivals, setNewArrivals, minPrice, setMinPrice, maxPrice, setMaxPrice,
    colors, setColors, materials, setMaterials, patterns, setPatterns,
    categories, setCategories, occasions, setOccasions, sizes, setSizes,
    options: filterOptions,
    activeCount,
    isPending,
    onClose: () => setIsFilterOpen(false),
    onApply: applyFilters,
    onReset: resetFilters,
    setPriceBracket: (min, max) => { setMinPrice(min?.toString() ?? ''); setMaxPrice(max?.toString() ?? '') },
    moreFiltersOpen,
    setMoreFiltersOpen,
  }

  return (
    <>
      {/* Full-screen loading overlay — shown via useTransition isPending */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080604]/80 backdrop-blur-sm"
          style={{ backdropFilter: 'blur(8px)' }}>
          <LoadingSpinner />
        </div>
      )}

      <div className="mb-6">
        <div className="relative">

          {/* Main button — always opens the modal */}
          <button
            onClick={() => setIsFilterOpen(o => !o)}
            aria-expanded={isFilterOpen}
            className={`
              group relative w-full flex items-center justify-between
              px-8 py-5 rounded-2xl overflow-hidden font-bold text-gray-900 text-base tracking-wide
              focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/40
              transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
              shadow-[0_6px_30px_rgba(212,175,55,0.35)]
              ${isFloating
                ? 'opacity-0 scale-95 pointer-events-none cursor-default'
                : 'opacity-100 scale-100 hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:shadow-[0_14px_50px_rgba(212,175,55,0.55)]'
              }
            `}
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C9A227 40%, #B8960F 100%)' }}
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none" />
            <span className="relative z-10 flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-black/10 group-hover:bg-black/15 transition-colors">
                <SlidersHorizontal className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
              </span>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-base font-bold">Filter &amp; Sort Products</span>
                <span className="text-xs font-medium text-gray-700 opacity-80">
                  {activeCount > 0 ? `${activeCount} filter${activeCount > 1 ? 's' : ''} active` : 'Find your perfect piece'}
                </span>
              </span>
            </span>
            <span className="relative z-10 flex items-center gap-2">
              {activeCount > 0 && (
                <span className="flex items-center justify-center w-6 h-6 bg-[#7A1E2C] text-white text-xs font-bold rounded-full shadow-md">{activeCount}</span>
              )}
              <Sparkles className="w-4 h-4 text-gray-800 opacity-70" />
              <span className="hidden sm:inline text-sm font-semibold text-gray-800 opacity-80">Open</span>
              <ChevronDown className="w-5 h-5 text-gray-800" />
            </span>
          </button>

          {/* Sentinel for IntersectionObserver — detects when main button scrolls out of view */}
          <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

          {/* Floating pill — LEFT side, appears when main button scrolls out */}
          <div className={`
            fixed top-[72px] left-5 z-50
            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${isFloating
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 -translate-y-2 scale-90 pointer-events-none'
            }
          `}>
            <button
              onClick={() => setIsFilterOpen(o => !o)}
              className="group relative flex items-center gap-2.5 px-5 py-3 rounded-2xl overflow-hidden font-bold text-gray-900 text-sm focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/40 transition-all duration-300 hover:-translate-y-1 hover:scale-105 active:scale-95 shadow-[0_8px_32px_rgba(212,175,55,0.5)] hover:shadow-[0_16px_48px_rgba(212,175,55,0.65)]"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8960F 100%)' }}
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none" />
              <SlidersHorizontal className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
              <span className="relative z-10 hidden sm:inline">Filters</span>
              {activeCount > 0 && (
                <span className="relative z-10 flex items-center justify-center w-5 h-5 bg-[#7A1E2C] text-white text-[11px] font-bold rounded-full">{activeCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal — ALWAYS a modal, whether triggered by the main button or the floating pill.
          No inline panel at all — eliminates the jarring inline→modal transition entirely. */}
      <div className={`
        fixed inset-0 z-[60] transition-all duration-300 ease-out
        ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}>
        {/* Blurred backdrop */}
        <div
          className="absolute inset-0 cursor-pointer"
          style={{ backdropFilter: 'blur(14px) saturate(0.6)', backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={() => setIsFilterOpen(false)}
        />
        {/* Modal card */}
        <div className={`
          relative z-10 mx-auto mt-20 w-full max-w-2xl px-4
          transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isFilterOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95'}
        `}>
          <div
            className="absolute -inset-1 rounded-3xl blur-xl opacity-25 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #7A1E2C)' }}
          />
          <FilterPanelContent {...panelProps} />
        </div>
      </div>

      <style>{`
        option { background-color: #1a1714 !important; color: #f3f4f6 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}