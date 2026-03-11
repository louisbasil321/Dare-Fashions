'use server'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import MarkAsPaidButton from '@/components/admin/MarkAsPaidButton'
import { ArrowLeft } from 'lucide-react'
import { getVideoThumbnailUrl } from '@/lib/cloudinary-helpers'
import CopyReviveLink from '@/components/admin/CopyReviveLink'
import SendWhatsAppLink from '@/components/admin/SendWhatsappLink'

export default async function AdminBasketDetailPage({
  params,
}: {
  params: Promise<{ basketId: string }>
}) {
  const { basketId } = await params
  const supabase = await createClient()

  // Fetch basket with items and product details
  const { data: basket, error } = await supabase
    .from('baskets')
    .select(`
      *,
      items:basket_items(
        *,
        product:products(*)
      )
    `)
    .eq('id', basketId)
    .single()

  if (error || !basket) notFound()

  const total = basket.items.reduce(
    (sum: number, item: any) => sum + item.quantity * item.product.price,
    0
  )

  const canBePaid = basket.status === 'pending'
  const isPaid = basket.status === 'paid'

  // Status badge color mapping
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    invalid: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Back link */}
      <Link
        href="/admin/baskets"
        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Baskets
      </Link>

      {/* Title and action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Basket #{basketId.slice(0, 8)}
        </h1>

        {!isPaid && (
          <div className="flex items-center gap-2">
            <CopyReviveLink
              basketId={basket.id}
              customerId={basket.customer_id}
              guestId={basket.guest_session_id}
            />
            <SendWhatsAppLink
              phone={basket.phone}
              basketId={basket.id}
              customerId={basket.customer_id}
              guestId={basket.guest_session_id}
            />
          </div>
        )}
      </div>

      {!canBePaid && basket.status === 'invalid' && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg mb-4">
          This basket is invalid and cannot be marked as paid. Customer must adjust quantities.
        </div>
      )}

      {/* Customer Info Card */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
            <p className="text-gray-900 dark:text-white">{basket.customer_name || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
            <p className="text-gray-900 dark:text-white">{basket.phone || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">State</p>
            <p className="text-gray-900 dark:text-white">{basket.state || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColors[basket.status as keyof typeof statusColors]}`}>
              {basket.status}
            </span>
          </div>
          {basket.paid_at && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Paid at</p>
              <p className="text-gray-900 dark:text-white">{new Date(basket.paid_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Items</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {basket.items.map((item: any) => {
            const imageSrc = item.product.image_url || getVideoThumbnailUrl(item.product.video_url)
            return (
              <div
                key={item.id}
                className="flex gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                {imageSrc && (
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={imageSrc}
                      alt={item.product.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{item.product.name}</h3>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <p>Quantity: {item.quantity}</p>
                    <p>Unit Price: {formatCurrency(item.product.price)}</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      Subtotal: {formatCurrency(item.quantity * item.product.price)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            Total: {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Mark as Paid Button (if applicable) */}
      {canBePaid && (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <MarkAsPaidButton basketId={basketId} currentStatus={basket.status} />
        </div>
      )}
    </div>
  )
}