'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function updateProductEmbedding(productId: string, keywords: any) {
  const text = [
    ...(keywords.colors     || []),
    ...(keywords.materials  || []),
    ...(keywords.patterns   || []),
    ...(keywords.categories || []),
    ...(keywords.occasions  || []),
  ].join(' ')

  if (!text) return

  const supabase = createAdminClient()

  const { error } = await supabase.functions.invoke('hyper-responder', {
    body: { productId, keywords },
  })

  if (error) throw error
}