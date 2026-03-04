import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditProductForm from '@/components/admin/EditProductForm'
import AIAssistant from '@/components/admin/AIAssistant'
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (!product) notFound()

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Edit Product</h1>
      <EditProductForm product={product} />
      <AIAssistant productId={productId}/>
    </div>
  )
}