'use server'

import { createClient } from '@/lib/supabase/server'
import { pipeline } from '@xenova/transformers'

// Reuse the same model as vectorSearch.ts — singleton to avoid reloading
let embedder: Promise<any> | null = null

async function getEmbedder() {
  if (!embedder) {
    embedder = pipeline('feature-extraction', 'Supabase/gte-small')
  }
  return embedder
}

export async function updateProductEmbedding(productId: string, keywords: any) {
  const supabase = await createClient()

  // Build text from all keyword groups (excluding sizes — not semantic)
  const text = [
    ...(keywords.colors     || []),
    ...(keywords.materials  || []),
    ...(keywords.patterns   || []),
    ...(keywords.categories || []),
    ...(keywords.occasions  || []),
  ].join(' ')

  if (!text) return // nothing to embed

  // Generate embedding using the same pipeline as vectorSearch.ts
  const extractor = await getEmbedder()
  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true,
  })

  // Convert to the PostgreSQL vector literal format that match_products expects
  // Must match exactly what vectorSearch.ts sends as query_embedding
  const embeddingArray = Array.from(output.data) as number[]
  const embeddingString = `[${embeddingArray.join(',')}]`

  // Update the product row
  const { error } = await supabase
    .from('products')
    .update({ keywords_embedding: embeddingString })
    .eq('id', productId)

  if (error) throw error
}