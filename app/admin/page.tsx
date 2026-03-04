import { createAdminClient } from '@/lib/supabase/admin'
import NewsletterSection from '@/components/admin/NewsLetterSection'
import AdminLink from '@/components/admin/AdminLink'

export default async function AdminDashboard() {
  const supabase = createAdminClient()
  const [
    { count: pendingBaskets },
    { count: paidBaskets },
    { count: invalidBaskets },
    { count: pendingOrders },
    { count: deliveredOrders },
    { count: ProductsAdded }
  ] = await Promise.all([
    supabase.from('baskets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('baskets').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('baskets').select('*', { count: 'exact', head: true }).eq('status', 'invalid'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).is('delivered_at', null),
    supabase.from('orders').select('*', { count: 'exact', head: true }).not('delivered_at', 'is', null),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('deleted', false),
  ])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard title="Pending Baskets"   count={pendingBaskets  ?? 0} href="/admin/baskets?status=pending" />
        <StatCard title="Paid Baskets"      count={paidBaskets     ?? 0} href="/admin/baskets?status=paid"    />
        <StatCard title="Invalid Baskets"   count={invalidBaskets  ?? 0} href="/admin/baskets?status=invalid" />
        <StatCard title="Orders to Deliver" count={pendingOrders   ?? 0} href="/admin/orders?delivered=false" />
        <StatCard title="Delivered Orders"  count={deliveredOrders ?? 0} href="/admin/orders?delivered=true"  />
        <StatCard title="Created Products"  count={ProductsAdded   ?? 0} href="/admin/products"               />
      </div>
      <NewsletterSection />
    </div>
  )
}

function StatCard({ title, count, href }: { title: string; count: number; href: string }) {
  return (
    <AdminLink
      href={href}
      className="block bg-white dark:bg-[#1e1e1e] p-6 rounded-lg shadow hover:shadow-md transition border border-gray-200 dark:border-gray-700"
    >
      <h2 className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</h2>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{count}</p>
    </AdminLink>
  )
}