'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateProduct, uploadProductImage, uploadProductVideo, deleteCloudinaryFile } from '@/actions/admin'
import type { Product, ProductUpdate } from '@/lib/types'
import { BookOpen, ArrowLeft } from 'lucide-react'
import CatalogSelector from './CatalogSelector'
import KeywordsInput from './KeywordsInput'
import Image from 'next/image'
import Link from 'next/link'

export default function EditProductForm({ product }: { product: Product }) {
  const router = useRouter()

  // ── Form fields (initialised from product) ──────────────────────────────
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description || '')
  const [price, setPrice] = useState(product.price.toString())
  const [stock, setStock] = useState(product.stock.toString())
  const [sex, setSex] = useState(product.sex || 'men')
  const [catalogOpen, setCatalogOpen] = useState(false)

  // Keywords (product.keywords is jsonb, we safely cast to expected shape)
  const productKeywords = (product.keywords as any) || {}
  const [colors, setColors] = useState<string[]>(productKeywords.colors || [])
  const [materials, setMaterials] = useState<string[]>(productKeywords.materials || [])
  const [patterns, setPatterns] = useState<string[]>(productKeywords.patterns || [])
  const [categories, setCategories] = useState<string[]>(productKeywords.categories || [])
  const [occasions, setOccasions] = useState<string[]>(productKeywords.occasions || [])
  const [sizes, setSizes] = useState<string[]>(productKeywords.sizes || [])

  // Media
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_url || null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoFileName, setVideoFileName] = useState<string | null>(null)

  // UI states
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Handlers (exactly like ProductForm) ─────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setImageFile(null)
      setImagePreview(product.image_url || null)
    }
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setVideoFile(file || null)
    setVideoFileName(file ? file.name : null)
    setVideoPreview(file ? URL.createObjectURL(file) : null)
  }

  // ── Submit – update product, upload new media, delete old ───────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const priceNum = parseInt(price, 10)
    const stockNum = parseInt(stock, 10)

    if (!name || isNaN(priceNum) || isNaN(stockNum)) {
      setError('Please fill all required fields correctly.')
      return
    }

    // File size checks (same as ProductForm)
    if (imageFile && imageFile.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB.')
      return
    }
    if (videoFile && videoFile.size > 3 * 1024 * 1024) {
      setError('Video must be less than 3MB.')
      return
    }

    let imageUrl = product.image_url
    let videoUrl = product.video_url
    const oldImageUrl = product.image_url
    const oldVideoUrl = product.video_url

    // Upload new image if provided
    if (imageFile) {
      setUploadingImage(true)
      try {
        const fd = new FormData()
        fd.append('image', imageFile)
        const { publicUrl } = await uploadProductImage(fd)
        imageUrl = publicUrl ?? null
      } catch (err: any) {
        setError(err.message || 'Image upload failed')
        setUploadingImage(false)
        return
      }
      setUploadingImage(false)
    }

    // Upload new video if provided
    if (videoFile) {
      setUploadingVideo(true)
      try {
        const fd = new FormData()
        fd.append('video', videoFile)
        const { publicUrl } = await uploadProductVideo(fd)
        videoUrl = publicUrl ?? null
      } catch (err: any) {
        setError(err.message || 'Video upload failed')
        setUploadingVideo(false)
        return
      }
      setUploadingVideo(false)
    }

    const updates: ProductUpdate = {
      name,
      description: description || null,
      price: priceNum,
      stock: stockNum,
      sex,
      image_url: imageUrl,
      video_url: videoUrl,
      keywords: { colors, materials, patterns, categories, occasions, sizes },
    }

    setUpdating(true)
    try {
      await updateProduct(product.id, updates)

      // Delete old files if they were replaced
      if (imageFile && oldImageUrl) {
        await deleteCloudinaryFile(oldImageUrl).catch(console.error)
      }
      if (videoFile && oldVideoUrl) {
        await deleteCloudinaryFile(oldVideoUrl).catch(console.error)
      }

      alert('Product updated successfully!')
      router.push('/admin/products')
      router.refresh()
    } catch (err: any) {
      setError(`Update failed: ${err.message || 'Unknown error'}`)
    } finally {
      setUpdating(false)
    }
  }

  // ── Same styling as ProductForm ─────────────────────────────────────────
  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none'

  return (
    <>
     <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[var(--gold-dark)] dark:hover:text-[var(--gold-dark)] transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Edit Product</h2>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name + Browse Catalog */}
          <div>
            <input
              type="text"
              placeholder="Product Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          {/* Description */}
          <textarea
            placeholder="Description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
          />

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Price *"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputCls}
            />
            <input
              type="number"
              placeholder="Stock *"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Sex */}
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className={inputCls}
            required
          >
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>

          {/* Keywords (with AI Assist) */}
          <KeywordsInput
            colors={colors} setColors={setColors}
            materials={materials} setMaterials={setMaterials}
            patterns={patterns} setPatterns={setPatterns}
            categories={categories} setCategories={setCategories}
            occasions={occasions} setOccasions={setOccasions}
            sizes={sizes} setSizes={setSizes}
            imagePreview={imagePreview}
            videoPreview={videoPreview}
            
          />

          {/* Image upload */}
          <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-blue-500 transition">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">Click to replace image</span>{' '}
                (optional)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
            <input
              type="file"
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

          {/* Video upload */}
          <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-purple-500 transition">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M15 10l4.553-2.276A2 2 0 0122 9.618V18m-7 0h7m0 0v7a4 4 0 01-4 4h-6a4 4 0 01-4-4v-6a4 4 0 014-4h6z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M30 14l8 8m0-8l-8 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-purple-600 dark:text-purple-400">Click to add/replace video</span>{' '}
                (optional)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">MP4, WebM, etc. Max 3MB</p>
              {videoFileName && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">Selected: {videoFileName}</p>
              )}
              {product.video_url && !videoFile && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Current video exists</p>
              )}
            </div>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={uploadingImage || uploadingVideo || updating}
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#7A1E2C] hover:from-[#B8960F] hover:to-[#5A1620] disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {uploadingImage ? 'Uploading image...'
              : uploadingVideo ? 'Uploading video...'
              : updating ? 'Saving...'
              : 'Save Changes'}
          </button>
        </div>
      </form>

      <CatalogSelector
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSelect={(name, description) => {
          setName(name)
          setDescription(description)
        }}
      />
    </>
  )
}