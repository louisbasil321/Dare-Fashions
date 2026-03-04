'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadProductImage, uploadProductVideo } from '@/actions/admin'
import { updateProductEmbedding } from '@/actions/embedding'
import type { ProductInsert } from '@/lib/types'
import { BookOpen } from 'lucide-react'
import CatalogSelector from '@/components/admin/CatalogSelector'
import KeywordsInput from './KeywordsInput'
import Image from 'next/image'

export default function ProductForm() {
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo,  setUploadingVideo]  = useState(false)
  const [inserting,       setInserting]       = useState(false)
  const [formError,       setFormError]       = useState<string | null>(null)
  const [imagePreview,    setImagePreview]    = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoFileName,   setVideoFileName]   = useState<string | null>(null)
  const [catalogOpen,     setCatalogOpen]     = useState(false)
  const [name,            setName]            = useState('')
  const [description,     setDescription]     = useState('')
  const [sex,             setSex]             = useState('men')

  // Keyword states
  const [colors,     setColors]     = useState<string[]>([])
  const [materials,  setMaterials]  = useState<string[]>([])
  const [patterns,   setPatterns]   = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [occasions,  setOccasions]  = useState<string[]>([])
  const [sizes,      setSizes]      = useState<string[]>([])

  // Auto-detect sex from name + description (unchanged)
  useEffect(() => {
    const text = (name + ' ' + description).toLowerCase()
    const femaleKeywords = ['female', 'women', 'woman', 'girl', 'ladies', 'dress']
    setSex(femaleKeywords.some(kw => text.includes(kw)) ? 'women' : 'men')
  }, [name, description])

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef  = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setVideoFileName(file ? file.name : null)
    setVideoPreview(file ? URL.createObjectURL(file) : null)
  }

  // ── Submit (completely unchanged) ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)

    const formData  = new FormData(e.currentTarget)
    const price     = parseInt(formData.get('price') as string, 10)
    const stock     = parseInt(formData.get('stock') as string, 10)
    const imageFile = formData.get('image') as File
    const videoFile = formData.get('video') as File

    if (!name || isNaN(price) || isNaN(stock)) {
      setFormError('Please fill all required fields correctly.')
      return
    }

    const hasImage = imageFile && imageFile.size > 0
    const hasVideo = videoFile && videoFile.size > 0
    if (!hasImage && !hasVideo) {
      setFormError('Please provide at least an image or a video.')
      return
    }
    if (hasImage && imageFile.size > 10 * 1024 * 1024) {
      setFormError('Image must be less than 10MB.')
      return
    }
    if (hasVideo && videoFile.size > 3 * 1024 * 1024) {
      setFormError('Video must be less than 3MB.')
      return
    }

    let imageUrl: string | null = null
    let videoUrl:  string | null = null

    if (hasImage) {
      setUploadingImage(true)
      try {
        const fd = new FormData()
        fd.append('image', imageFile)
        const { publicUrl } = await uploadProductImage(fd)
        imageUrl = publicUrl ?? null
      } catch (error) {
        console.error('Image upload failed:', error)
        setFormError('Image upload failed. Please try again.')
        setUploadingImage(false)
        return
      }
      setUploadingImage(false)
    }

    if (hasVideo) {
      setUploadingVideo(true)
      try {
        const fd = new FormData()
        fd.append('video', videoFile)
        const { publicUrl } = await uploadProductVideo(fd)
        videoUrl = publicUrl ?? null
      } catch (error: any) {
        console.error('Video upload failed:', error)
        setFormError(error.message || 'Video upload failed.')
        setUploadingVideo(false)
        return
      }
      setUploadingVideo(false)
    }

    const newProduct: ProductInsert = {
      name,
      description: description || null,
      price,
      stock,
      available: stock,
      image_url: imageUrl,
      video_url:  videoUrl,
      sex,
      keywords: { colors, materials, patterns, categories, occasions, sizes },
    }

    setInserting(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .insert(newProduct)
        .select('id')
        .single()
      if (error) throw error

      updateProductEmbedding(data.id, newProduct.keywords).catch(err =>
        console.error('Embedding update failed:', err)
      )

      alert('Product added successfully!')
      window.location.reload()
    } catch (error: any) {
      setFormError(`Database error: ${error.message || 'Unknown error'}`)
    } finally {
      setInserting(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none'

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Add New Product</h2>

        {formError && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {formError}
          </div>
        )}

        <div className="space-y-4">

          {/* ── Name + Browse Catalog ──────────────────────────────────────── */}
          <div>
            <input
              name="name"
              placeholder="Product Name *"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputCls}
            />
            <div className="flex items-center mt-2 px-1">
              <button
                type="button"
                onClick={() => setCatalogOpen(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <BookOpen className="w-4 h-4 flex-shrink-0" />
                Browse Catalog
              </button>
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 italic">
                fills name &amp; description
              </span>
            </div>
          </div>

          {/* ── Description ───────────────────────────────────────────────── */}
          <textarea
            name="description"
            placeholder="Description"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={inputCls}
          />

          {/* ── Price + Stock ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <input name="price" type="number" placeholder="Price *"  required className={inputCls} />
            <input name="stock" type="number" placeholder="Stock *"  required className={inputCls} />
          </div>

          {/* ── Sex ───────────────────────────────────────────────────────── */}
          <select value={sex} onChange={e => setSex(e.target.value)} className={inputCls} required>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>

          {/* ── Keywords — BEFORE media so admin fills content before assets ─ */}
          {/*    AI Assist button lives inside KeywordsInput header             */}
          <KeywordsInput
            colors={colors}         setColors={setColors}
            materials={materials}   setMaterials={setMaterials}
            patterns={patterns}     setPatterns={setPatterns}
            categories={categories} setCategories={setCategories}
            occasions={occasions}   setOccasions={setOccasions}
            sizes={sizes}           setSizes={setSizes}
            imagePreview={imagePreview}
            videoPreview={videoPreview}
          />

          {/* ── Image upload ───────────────────────────────────────────────── */}
          <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-blue-500 transition">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload image</span>{' '}
                (optional, but at least one media required)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {imagePreview && (
              <div className="mt-4 relative h-32 w-32 mx-auto">
                <Image src={imagePreview} alt="Preview" fill className="object-cover rounded-lg" />
              </div>
            )}
          </div>

          {/* ── Video upload ───────────────────────────────────────────────── */}
          <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-purple-500 transition">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M15 10l4.553-2.276A2 2 0 0122 9.618V18m-7 0h7m0 0v7a4 4 0 01-4 4h-6a4 4 0 01-4-4v-6a4 4 0 014-4h6z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M30 14l8 8m0-8l-8 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-purple-600 dark:text-purple-400">Click to upload video</span>{' '}
                (optional, but at least one media required)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">MP4, WebM, etc. Max 3MB</p>
              {videoFileName && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">Selected: {videoFileName}</p>
              )}
            </div>
            <input
              ref={videoInputRef}
              type="file"
              name="video"
              accept="video/*"
              onChange={handleVideoChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={uploadingImage || uploadingVideo || inserting}
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#7A1E2C] hover:from-[#B8960F] hover:to-[#5A1620] disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {uploadingImage ? 'Uploading image...'
              : uploadingVideo ? 'Uploading video...'
              : inserting     ? 'Saving...'
              : 'Add Product'}
          </button>
        </div>
      </form>

      {/* CatalogSelector portalled to body inside its own file */}
      <CatalogSelector
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSelect={(selectedName, selectedDescription) => {
          setName(selectedName)
          setDescription(selectedDescription)
        }}
      />
    </>
  )
}