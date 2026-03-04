/**
 * backfill-embeddings.ts
 *
 * Finds every product with keywords but no embedding,
 * generates vector(384) using Supabase/gte-small (same as embedding.ts),
 * and saves it to keywords_embedding.
 *
 * Uses zero new packages — same pipeline as your existing embedding.ts
 *
 * Run from project root:
 *   npx tsx scripts/backfill-embeddings.ts
 *   (tsx is already in your devDependencies via Next.js)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { pipeline } from '@xenova/transformers'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// Service role key bypasses RLS for direct writes
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// ── Embedder singleton — exactly as in embedding.ts ──────────────────────────
let embedder: any = null
async function getEmbedder() {
  if (!embedder) {
    console.log('Loading Supabase/gte-small...')
    embedder = await pipeline('feature-extraction', 'Supabase/gte-small')
    console.log('Model ready ✓\n')
  }
  return embedder
}

// ── Build text — exactly as in embedding.ts ───────────────────────────────────
function buildText(keywords: any): string {
  return [
    ...(keywords.colors     || []),
    ...(keywords.materials  || []),
    ...(keywords.patterns   || []),
    ...(keywords.categories || []),
    ...(keywords.occasions  || []),
  ].join(' ').trim()
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Fetch products with keywords but no embedding
  process.stdout.write('Fetching products... ')
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, keywords')
    .eq('deleted', false)
    .is('keywords_embedding', null)
    .not('keywords', 'is', null)
    .limit(1000)

  if (error) {
    console.error('✗ Fetch failed:', error.message)
    process.exit(1)
  }

  console.log(`${products.length} found\n`)

  if (products.length === 0) {
    console.log('Nothing to do ✓')
    return
  }

  const extractor = await getEmbedder()

  let ok = 0, skipped = 0, failed = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    process.stdout.write(`  [${i + 1}/${products.length}] ${p.name.slice(0, 50)}... `)

    const text = buildText(p.keywords)
    if (!text) {
      console.log('⚠ empty keywords — skipped')
      skipped++
      continue
    }

    try {
      const output = await extractor(text, { pooling: 'mean', normalize: true })
      const embeddingArray = Array.from(output.data) as number[]
      const embeddingString = `[${embeddingArray.join(',')}]`

      const { error: saveError } = await supabase
        .from('products')
        .update({ keywords_embedding: embeddingString })
        .eq('id', p.id)

      if (saveError) throw new Error(saveError.message)

      console.log('✓')
      ok++
    } catch (e: any) {
      console.log(`✗ ${e.message}`)
      failed++
    }
  }

  console.log(`\n${'─'.repeat(45)}`)
  console.log(`  Done — ${ok} saved, ${skipped} skipped, ${failed} failed`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})