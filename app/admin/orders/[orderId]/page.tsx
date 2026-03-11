'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { getVideoThumbnailUrl } from '@/lib/cloudinary-helpers'
import DownloadOrderPDF from '@/components/admin/DownloadOrderPDF' // 👈 import the single‑order PDF component

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const supabase = createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('id', orderId)
    .single()

  if (error || !order) notFound()

  const total = order.total || order.items.reduce((sum: number, item: any) => sum + item.subtotal, 0)

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Back link */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Orders
      </Link>

      {/* Title + Download button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Order #{orderId.slice(0, 8)}
        </h1>
        <DownloadOrderPDF order={order} /> {/* 👈 button added */}
      </div>

      {/* Customer Info Card */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
            <p className="text-gray-900 dark:text-white">{order.customer_name || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
            <p className="text-gray-900 dark:text-white">{order.phone || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">State</p>
            <p className="text-gray-900 dark:text-white">{order.state || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Paid at</p>
            <p className="text-gray-900 dark:text-white">{new Date(order.paid_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Delivered</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              order.delivered_at
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {order.delivered_at ? 'Yes' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Items</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.items.map((item: any) => {
            const imageSrc = item.image_url || getVideoThumbnailUrl(item.video_url)
            return (
            <div
              key={item.id}
              className="flex gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              {imageSrc && (
                <div className="relative w-16 h-16 flex-shrink-0">
                  <Image
                    src={imageSrc}
                    alt={item.product_name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">{item.product_name}</h3>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>Quantity: {item.quantity}</p>
                  <p>Unit Price: {formatCurrency(item.price_at_time)}</p>
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    Subtotal: {formatCurrency(item.subtotal)}
                  </p>
                </div>
              </div>
            </div>
          )})}
        </div>
        <div className="mt-6 flex justify-end">
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            Total: {formatCurrency(total)}
          </p>
        </div>
      </div>
    </div>
  )
}