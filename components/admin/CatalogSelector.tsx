'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Search } from 'lucide-react'
import catalogData from '@/lib/product-catalog.json'

interface CatalogItem {
  id: string
  name: string
  descriptions: string[]
}

interface Subcategory {
  name: string
  items: CatalogItem[]
}

interface Catalog {
  femaleWear:  { category: string; subcategories: Subcategory[] }
  maleWear:    { category: string; subcategories: Subcategory[] }
  unisexWear:  { category: string; subcategories: Subcategory[] }
}

const catalog = catalogData as Catalog

interface Props {
  isOpen:   boolean
  onClose:  () => void
  onSelect: (name: string, description: string) => void
}

export default function CatalogSelector({ isOpen, onClose, onSelect }: Props) {
  const [search,           setSearch]           = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'femaleWear' | 'maleWear' | 'unisexWear'>('all')
  const [filteredItems,    setFilteredItems]    = useState<CatalogItem[]>([])
  const [mounted,          setMounted]          = useState(false)

  // Portal requires document — only available after hydration
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isOpen) return
    const allItems: CatalogItem[] = []
    const cats = selectedCategory === 'all'
      ? ['femaleWear', 'maleWear', 'unisexWear'] as const
      : [selectedCategory] as const

    cats.forEach(cat =>
      catalog[cat].subcategories.forEach(sub =>
        sub.items.forEach(item => allItems.push(item))
      )
    )

    setFilteredItems(
      allItems.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.descriptions.some(d => d.toLowerCase().includes(search.toLowerCase()))
      )
    )
  }, [search, selectedCategory, isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const tabs = [
    { key: 'all'        as const, label: 'All',         active: 'bg-gray-800 text-white'   },
    { key: 'femaleWear' as const, label: 'Female Wear', active: 'bg-pink-600 text-white'   },
    { key: 'maleWear'   as const, label: 'Male Wear',   active: 'bg-blue-600 text-white'   },
    { key: 'unisexWear' as const, label: 'Unisex',      active: 'bg-purple-600 text-white' },
  ]

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[82vh] flex flex-col border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Product Catalog</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + category tabs */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products or descriptions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-90 ${
                  selectedCategory === tab.key
                    ? tab.active
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results — scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12 text-sm">No products found.</p>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => { onSelect(item.name, item.descriptions[0]); onClose() }}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer
                             hover:border-[#D4AF37] dark:hover:border-[#D4AF37]
                             hover:bg-[#D4AF37]/5 dark:hover:bg-[#D4AF37]/10
                             transition-all duration-150 group"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#D4AF37] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {item.descriptions[0]}
                  </p>
                  {item.descriptions.length > 1 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                      +{item.descriptions.length - 1} more description{item.descriptions.length > 2 ? 's' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} — click any to fill the form
        </div>
      </div>
    </div>,
    document.body
  )
}