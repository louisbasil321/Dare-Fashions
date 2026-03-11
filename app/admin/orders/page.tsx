'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import OrdersFilter from '@/components/admin/OrdersFilter'
import OrdersTable from '@/components/admin/OrdersTable'
import DownloadOrdersPDF from '@/components/admin/DownloadOrdersPDF'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; from?: string; to?: string; delivered?: string }>
}) {
  const { state, from, to, delivered } = await searchParams
  const supabase = createAdminClient()

  let query = supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .order('paid_at', { ascending: false })

  if (state) {
    query = query.eq('state', state)
  }
  if (from) {
    query = query.gte('paid_at', from)
  }
  if (to) {
    query = query.lte('paid_at', to)
  }
  if (delivered === 'false') {
    query = query.is('delivered_at', null)
  } else if (delivered === 'true') {
    query = query.not('delivered_at', 'is', null)
  }

  const { data: orders } = await query

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <OrdersFilter /> {/* No props needed */}
      <div className="mb-4 flex justify-end">
        <DownloadOrdersPDF orders={orders || []} />
      </div>
      <OrdersTable orders={orders || []} />
    </div>
  )
}