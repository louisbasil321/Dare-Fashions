// actions/vectorSearch.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { pipeline } from '@xenova/transformers'

let embedder: Promise<any> | null = null

async function getEmbedder() {
  if (!embedder) {
    embedder = pipeline('feature-extraction', 'Supabase/gte-small')
  }
  return embedder
}

export async function vectorSearch(query: string) {
  const supabase = await createClient()

  const extractor = await getEmbedder()
  const output = await extractor(query, {
    pooling: 'mean',
    normalize: true,
  })

  const queryEmbedding = Array.from(output.data) as number[]
  const embeddingString = `[${queryEmbedding.join(',')}]`

  // 0.5 — tight enough to exclude noise, loose enough for near-synonyms
  // (gown≈dress, cocktail≈formal, crimson≈red)
  const { data, error } = await supabase.rpc('match_products', {
    query_embedding: embeddingString,
    match_threshold: 0.5,
  })

  if (error) throw error

  const matches = data as { id: string; similarity: number }[] | null
  if (!matches || matches.length === 0) return []

  const ids = matches.map(m => m.id)
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .in('id', ids)

  const simMap = new Map(matches.map(m => [m.id, m.similarity]))

  // Attach _similarity to each product so the shop page can use real
  // cosine scores for ranking rather than synthetic positional scores.
  return (products ?? [])
    .sort((a, b) => (simMap.get(b.id) ?? 0) - (simMap.get(a.id) ?? 0))
    .map(p => ({ ...p, _similarity: simMap.get(p.id) ?? 0 }))
}