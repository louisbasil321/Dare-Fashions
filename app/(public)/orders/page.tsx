
import {cookies} from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import OrderCard from '@/components/orders/OrderCard'
import OrderFilter from '@/components/orders/OrderFilter'
import { Package } from 'lucide-react'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ delivered?: string }>
}) {
  const cookieStore = await cookies()
  const userBasketId = cookieStore.get('basketId')?.value
  const guestSessionId = cookieStore.get('guest_session_id')?.value
  const { delivered } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let customer_orders: any[] = []

if (user) {
  const { data: userOrders } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        *,
        product:products(*)
      )
    `)
    .eq('customer_id', user.id)
    .order('paid_at', { ascending: false })

  if (userOrders) customer_orders = userOrders
}

if (customer_orders.length === 0 && guestSessionId) {
  const { data: guestOrders } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        *,
        product:products(*)
      )
    `)
    .eq('guest_session_id', guestSessionId)
    .order('paid_at', { ascending: false })

  if (guestOrders) customer_orders = guestOrders
}

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Orders</h1>
        <Link
          href="/baskets"
          className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4A030] text-gray-900 px-4 py-2 rounded-lg transition"
        >
          <Package className="w-4 h-4" />
          Back to Basket
        </Link>
      </div>

      <OrderFilter />

      {customer_orders && customer_orders.length > 0 ? (
        <div className="space-y-4">
          {customer_orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-[#1e1e1e] rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <Package className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-6">No orders yet.</p>
          <Link
            href="/shop"
            className="inline-flex items-center px-6 py-3 bg-[#D4AF37] hover:bg-[#C4A030] text-gray-900 rounded-lg transition"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  )
}