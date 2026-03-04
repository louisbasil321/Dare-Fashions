'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Zap, RefreshCw } from 'lucide-react'

interface Props {
  isOpen:   boolean
  onClose:  () => void
  imageUrl: string | null
  onApply:  (suggestions: any) => void
}

export default function AISuggestModal({ isOpen, onClose, imageUrl, onApply }: Props) {
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [editableKeywords,  setEditableKeywords]  = useState<Record<string, string[]>>({})
  const [editableName,      setEditableName]      = useState('')
  const [editableDesc,      setEditableDesc]      = useState('')
  const [mounted,           setMounted]           = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Re-fetch whenever the modal opens or imageUrl changes
  useEffect(() => {
    if (isOpen && imageUrl) fetchSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, imageUrl])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const fetchSuggestions = async () => {
    if (!imageUrl) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/generate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        // If we already have data, don't show an error – keep the existing keywords
        if (Object.keys(editableKeywords).length === 0) {
          setError(data.error || `Error ${res.status}: Failed to generate keywords`)
        }
        return
      }

      // Success – update with new data
      setEditableKeywords(data.keywords || {})
      setEditableName(data.suggestions?.name || '')
      setEditableDesc(data.suggestions?.description || '')

    } catch (err) {
      // Network error or JSON parse error – only show if we have no data yet
      if (Object.keys(editableKeywords).length === 0) {
        setError('Check your internet connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !mounted) return null

  const keywordGroups = ['colors', 'materials', 'patterns', 'categories', 'occasions']

  const fieldCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 outline-none transition'

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">AI Suggestions</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Edit before applying</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && imageUrl && (
              <button
                onClick={fetchSuggestions}
                title="Regenerate"
                className="p-2 rounded-xl text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Analysing image...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={fetchSuggestions}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition"
              >
                Retry
              </button>
            </div>
          ) : !imageUrl ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Upload a product image first, then use AI Assist to auto-fill keywords.
              </p>
            </div>
          ) : (
            <>
              {/* Keyword groups */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                  Keywords
                </h3>
                <div className="space-y-3">
                  {keywordGroups.map(group => (
                    <div key={group}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 capitalize mb-1.5">
                        {group}
                      </label>
                      <input
                        type="text"
                        value={editableKeywords[group]?.join(', ') || ''}
                        onChange={e =>
                          setEditableKeywords(prev => ({
                            ...prev,
                            [group]: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                          }))
                        }
                        placeholder={`e.g. ${group === 'colors' ? 'Red, Blue' : group === 'materials' ? 'Cotton, Silk' : '...'}`}
                        className={fieldCls}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                  Product Info
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Suggested Name
                    </label>
                    <input
                      type="text"
                      value={editableName}
                      onChange={e => setEditableName(e.target.value)}
                      className={fieldCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Suggested Description
                    </label>
                    <textarea
                      rows={3}
                      value={editableDesc}
                      onChange={e => setEditableDesc(e.target.value)}
                      className={fieldCls}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && !error && imageUrl && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onApply({
                  keywords:    editableKeywords,
                  suggestions: { name: editableName, description: editableDesc },
                })
              }
              className="px-6 py-2.5 text-sm font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition shadow-md"
            >
              Apply to Form
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}