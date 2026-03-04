'use client'

import { useState, useEffect } from 'react'
import { Zap, X } from 'lucide-react'
import { getVideoThumbnailUrl } from '@/lib/cloudinary-helpers'
// ── Single tag field ──────────────────────────────────────────────────────────
interface TagInputProps {
  label:    string
  values:   string[]
  onChange: (values: string[]) => void
}

function TagInput({ label, values, onChange }: TagInputProps) {
  const [input, setInput] = useState('')

  const add = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setInput('')
  }

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(input)
    }
    // Backspace on empty input removes last tag
    if (e.key === 'Backspace' && input === '' && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500 transition">
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-md text-sm font-medium"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors leading-none"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          // No onBlur add — avoids adding half-typed words when clicking elsewhere
          className="flex-1 min-w-[80px] outline-none border-none bg-transparent text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
          placeholder="Type &amp; press Enter or ,"
        />
      </div>
    </div>
  )
}

// ── Combined keywords component ───────────────────────────────────────────────
interface KeywordsInputProps {
  colors:        string[];  setColors:        (v: string[]) => void
  materials:     string[];  setMaterials:     (v: string[]) => void
  patterns:      string[];  setPatterns:      (v: string[]) => void
  categories:    string[];  setCategories:    (v: string[]) => void
  occasions:     string[];  setOccasions:     (v: string[]) => void
  sizes:         string[];  setSizes:         (v: string[]) => void
  imagePreview:  string | null,
  videoPreview:      string | null
}

export default function KeywordsInput({
  colors,     setColors,
  materials,  setMaterials,
  patterns,   setPatterns,
  categories, setCategories,
  occasions,  setOccasions,
  sizes,      setSizes,
  imagePreview,
  videoPreview,
}: KeywordsInputProps) {
  const [showAIModal, setShowAIModal] = useState(false)
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null)
  // Lazy-import AISuggestModal to avoid circular deps
  const [AISuggestModal, setAISuggestModal] = useState<any>(null)
  const openAI = async () => {
    if (!AISuggestModal) {
      const mod = await import('./AIsuggestModal')
      setAISuggestModal(() => mod.default)
    }
    setShowAIModal(true)
  }
   useEffect(() => {
  if (!videoPreview) { setVideoThumbnail(null); return }

  const isCloudinary = videoPreview.startsWith('https://res.cloudinary.com')
  if (isCloudinary) {
    setVideoThumbnail(getVideoThumbnailUrl(videoPreview))
  } else {
    // blob URL — extract frame client-side
    import('@/lib/video-thumbnail')
      .then(m => m.captureVideoFrame(videoPreview))
      .then(setVideoThumbnail)
      .catch(() => setVideoThumbnail(null))
  }
}, [videoPreview])
 const mediaPreview = imagePreview || videoThumbnail

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">

      {/* Header with AI Assist button */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Keywords</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Used for search &amp; filtering</p>
        </div>
        <button
          type="button"
          onClick={openAI}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition shadow-sm"
          title="Auto-fill keywords from product image using AI"
        >
          <Zap className="w-3.5 h-3.5" />
          AI Assist
        </button>
      </div>

      {/* Tag fields grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <TagInput label="Colors"     values={colors}     onChange={setColors}     />
        <TagInput label="Materials"  values={materials}  onChange={setMaterials}  />
        <TagInput label="Patterns"   values={patterns}   onChange={setPatterns}   />
        <TagInput label="Categories" values={categories} onChange={setCategories} />
        <TagInput label="Occasions"  values={occasions}  onChange={setOccasions}  />
        <TagInput label="Sizes"      values={sizes}      onChange={setSizes}      />
      </div>

      {/* AI modal — rendered here, portalled to body inside AISuggestModal itself */}
      {AISuggestModal && (
        <AISuggestModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          imageUrl={mediaPreview}
          onApply={(suggestions: any) => {
            if (suggestions.keywords?.colors)      setColors(suggestions.keywords.colors)
            if (suggestions.keywords?.materials)   setMaterials(suggestions.keywords.materials)
            if (suggestions.keywords?.patterns)    setPatterns(suggestions.keywords.patterns)
            if (suggestions.keywords?.categories)  setCategories(suggestions.keywords.categories)
            if (suggestions.keywords?.occasions)   setOccasions(suggestions.keywords.occasions)
            setShowAIModal(false)
          }}
        />
      )}
    </div>
  )
}