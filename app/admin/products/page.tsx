'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProductForm from '@/components/admin/ProductForm'
import { ProductCardList } from '@/components/admin/ProductCardList'

export default async function AdminProductsPage() {
  const supabase = createAdminClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('name')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Manage Products</h1>
      <ProductForm />
      <div className="mt-8">
        <ProductCardList products={products ?? []} />
      </div>
    </div>
  )
}