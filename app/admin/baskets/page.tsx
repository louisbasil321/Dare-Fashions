'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BasketCardList } from '@/components/admin/BasketCardList'
import MessageExtractor from '@/components/admin/MessageExtractor'

export default async function AdminBasketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; state?: string }>
}) {
  const { status, state } = await searchParams
  const supabase = createAdminClient()
   
  let query = supabase
    .from('baskets')
    .select(`
      *,
      items:basket_items(
        *,
        product:products(*)
      )
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (state) query = query.eq('state', state)

  const { data: baskets } = await query

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Manage Baskets</h1>
      
      {/* Filtering (optional – you can add filter UI here later) */}
      {/* Status filter could be added as select dropdowns */}
   
      <BasketCardList baskets={baskets ?? []} />
    </div>
  )
}