import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import ProductCard from '@/components/products/ProductCard'
import ProductSearchAndFilters from '@/components/products/ProductSearchAndFilters'
import { isProductNew } from '@/lib/utils'
import Link from 'next/link'
import { Product } from '@/lib/types'
import { getFilterOptions } from '@/actions/filters'
import { vectorSearch } from '@/actions/search'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    sex?: string
    sort?: string
    new?: string
    minPrice?: string
    maxPrice?: string
    colors?: string
    materials?: string
    patterns?: string
    categories?: string
    occasions?: string
    sizes?: string
  }>
}) {
  const {
    q, sex, sort, new: newProducts,
    minPrice, maxPrice,
    colors, materials, patterns, categories, occasions, sizes,
  } = await searchParams

  const supabase = await createClient()
  const cookieStore = await cookies()

  // ── Auth / admin (unchanged) ──────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: customer } = await supabase
      .from('customers')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = customer?.role === 'admin'
  }

  // ── Basket IDs (unchanged) ────────────────────────────────────────────────
  const guestSessionId = cookieStore.get('guest_session_id')?.value
  let basketProductIds = new Set<string>()

  if (user) {
    const { data: basket } = await supabase
      .from('baskets')
      .select('items:basket_items(product_id)')
      .eq('customer_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()
    if (basket?.items) {
      basketProductIds = new Set(basket.items.map((item: any) => item.product_id))
    }
  } else if (guestSessionId) {
    const { data: basket } = await supabase
      .from('baskets')
      .select('items:basket_items(product_id)')
      .eq('guest_session_id', guestSessionId)
      .eq('status', 'pending')
      .maybeSingle()
    if (basket?.items) {
      basketProductIds = new Set(basket.items.map((item: any) => item.product_id))
    }
  }

  // ── Filter options (unchanged) ────────────────────────────────────────────
  const filterOptions = await getFilterOptions()

  // ── Parse chip arrays from URL ────────────────────────────────────────────
  const parseList = (val?: string) => val?.split(',').filter(Boolean) ?? []
  const colorList     = parseList(colors)
  const materialList  = parseList(materials)
  const patternList   = parseList(patterns)
  const categoryList  = parseList(categories)
  const occasionList  = parseList(occasions)
  const sizeList      = parseList(sizes)
  const TYPE_FAMILIES: Record<string, Set<string>> = {
    dress:  new Set(['dress', 'gown', 'mini dress', 'maxi dress', 'midi dress',
                     'bodycon dress', 'wrap dress', 'shirt dress', 'slip dress',
                     'co-ord dress']),
    top:    new Set(['top', 'shirt', 'blouse', 'crop top', 't-shirt', 'tee',
                     'tank top', 'camisole', 'corset top']),
    bottom: new Set(['pants', 'trousers', 'shorts', 'skirt', 'jeans',
                     'leggings', 'culottes']),
    jacket: new Set(['jacket', 'coat', 'blazer', 'cardigan', 'hoodie',
                     'bomber', 'trench coat']),
    suit:   new Set(['suit', 'co-ord', 'two piece', 'matching set']),
    other:  new Set(['jumpsuit', 'romper', 'playsuit', 'overalls', 'dungarees']),
  }

  // Given a product's categories array, return the expanded type set for its family.
  // e.g. ['shirt'] → top family → {'shirt','blouse','top','crop top',...}
  function getTypeFamilySet(categories: string[]): Set<string> | null {
    const catsLower = new Set(categories.map(c => c.toLowerCase()))
    for (const members of Object.values(TYPE_FAMILIES)) {
      for (const cat of catsLower) {
        if (members.has(cat)) return members
      }
    }
    return null // unknown type — no constraint
  }

  // ── Inline trigram helper ──────────────────────────────────────────────────
  function trigramSimilarity(a: string, b: string): number {
    const trigrams = (s: string) => {
      const padded = `  ${s.toLowerCase()} `
      const t = new Set<string>()
      for (let i = 0; i < padded.length - 2; i++) t.add(padded.slice(i, i + 3))
      return t
    }
    const ta = trigrams(a)
    const tb = trigrams(b)
    let intersection = 0
    ta.forEach(t => { if (tb.has(t)) intersection++ })
    const union = ta.size + tb.size - intersection
    return union === 0 ? 1 : intersection / union
  }

  // ── Spell correction against keyword vocabulary ────────────────────────────
  function spellCorrect(words: string[], vocab: Set<string>): string[] {
    const vocabArr = Array.from(vocab)
    const extras: string[] = []
    for (const word of words) {
      if (vocab.has(word)) continue
      let bestScore = 0
      let bestMatch = ''
      for (const term of vocabArr) {
        const score = trigramSimilarity(word, term)
        if (score > bestScore) { bestScore = score; bestMatch = term }
      }
      if (bestScore >= 0.35 && bestMatch && !words.includes(bestMatch)) {
        extras.push(bestMatch)
      }
    }
    return [...new Set([...words, ...extras])]
  }

  let candidateIds: string[] | null = null
  let vectorScoreMap = new Map<string, number>()

  if (q) {
    const keywordFields = ['colors', 'materials', 'patterns', 'categories', 'occasions'] as const
    const originalWords = q.trim().toLowerCase().split(/\s+/).filter(Boolean)

    // ── Step 0: build vocab from filterOptions, spell-correct query ───────────
    const vocab = new Set<string>()
    for (const field of keywordFields) {
      const values = (filterOptions[field] ?? []) as string[]
      values.forEach(v => vocab.add(v.toLowerCase()))
    }
    const searchWords = spellCorrect(originalWords, vocab)
    const correctedExtras = searchWords.filter(w => !originalWords.includes(w))

    // ── Step 1: ilike per-word sets ───────────────────────────────────────────
    const perWordSets = new Map<string, Set<string>>()

    for (const word of searchWords) {
      const wordIds = new Set<string>()
      const { data: nameMatches } = await supabase
        .from('products').select('id').eq('deleted', false).ilike('name', `%${word}%`)
      nameMatches?.forEach((r: { id: string }) => wordIds.add(r.id))

      for (const field of keywordFields) {
        const { data: kwMatches } = await supabase
          .from('products').select('id').eq('deleted', false)
          .filter(`keywords->>'${field}'`, 'ilike', `%${word}%`)
        kwMatches?.forEach((r: { id: string }) => wordIds.add(r.id))
      }   
      perWordSets.set(word, wordIds)
    }   
         
    // ── Step 2: intersect original words (corrected extras expand each set) ───
    let intersected = new Set<string>()
    for (let i = 0; i < originalWords.length; i++) {
      const word = originalWords[i]
      const wordSet = perWordSets.get(word) ?? new Set<string>()
      const merged = new Set<string>(wordSet)
      for (const extra of correctedExtras) {
        (perWordSets.get(extra) ?? new Set<string>()).forEach(id => merged.add(id))
      }
      if (i === 0) {
        intersected = merged
      } else {
        for (const id of Array.from(intersected)) {
          if (!merged.has(id)) intersected.delete(id)
        }
      }
    }
    const ilikeIds = intersected

    // ── Step 3: vector search ─────────────────────────────────────────────────
    const vectorQuery = correctedExtras.length > 0
      ? [...originalWords.filter(w => vocab.has(w)), ...correctedExtras].join(' ')
      : q

    // Fetch full products for vector results so we can inspect their categories
    let vectorProducts: Array<{ id: string; keywords?: any; [key: string]: any }> = []
    try {
      vectorProducts = await vectorSearch(vectorQuery)
      for (const p of vectorProducts) {
        vectorScoreMap.set(p.id, (p as any)._similarity ?? 0)
      }
    } catch {
      // non-fatal
    } 

    // ── Step 4: type-aware vector expansion ───────────────────────────────────
    //
    // If ilike found results, determine which type family they belong to.
    // Vector can only ADD candidates from the same type family.
    //
    // 'formal shirt':
    //   ilike → shirts → family = top → vector can add blouses, other tops
    //                              → blocks formal gowns, dresses ✗
    //
    // 'blue dress':
    //   ilike → dresses/gowns → family = dress → vector adds more gowns ✓
    //                                           → blocks blue shirts ✗
    //
    // ilike empty → no type constraint → vector fires fully (synonym fallback)
    // e.g. 'navy dress' → ilike empty → vector finds blue dresses freely ✓

    if (ilikeIds.size > 0) {
      // Fetch categories for ilike candidates to determine type family
      const { data: ilikeCatData } = await supabase
        .from('products')
        .select('id, keywords')
        .in('id', Array.from(ilikeIds))

      // Collect all category values across ilike results
      const ilikeCats: string[] = []
      ilikeCatData?.forEach(p => {
        const cats = (p.keywords as any)?.categories ?? []
        ilikeCats.push(...cats)
      })

      // Find the dominant type family (most frequently occurring)
      const familyCounts: Record<string, number> = {}
      for (const cat of ilikeCats) {
        for (const [family, members] of Object.entries(TYPE_FAMILIES)) {
          if (members.has(cat.toLowerCase())) {
            familyCounts[family] = (familyCounts[family] ?? 0) + 1
          }
        }
      }
      const dominantFamily = Object.entries(familyCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0]
      const allowedTypes = dominantFamily
        ? TYPE_FAMILIES[dominantFamily]
        : null // unknown type — allow all vector additions

      // Filter vector candidates: only add if same type family
      const allowedVectorIds = new Set<string>()
      for (const p of vectorProducts) {
        if (ilikeIds.has(p.id)) continue // already in ilike, don't double-add
        if (!allowedTypes) {
          allowedVectorIds.add(p.id) // no constraint
          continue
        }
        const pCats = ((p.keywords as any)?.categories ?? []) as string[]
        const pFamily = getTypeFamilySet(pCats)
        // Add if product belongs to the same type family
        if (pFamily && [...pFamily].some(t => allowedTypes.has(t))) {
          allowedVectorIds.add(p.id)
        }
      }

      candidateIds = [...Array.from(ilikeIds), ...Array.from(allowedVectorIds)]

    } else {
      // ilike found nothing — vector fires without type constraint
      // Handles: 'navy dress', 'crimson gown', 'something for a wedding', etc.
      if (vectorProducts.length > 0) {
        candidateIds = vectorProducts.map(p => p.id)
      } else {
        return renderPage({ isAdmin, filterOptions, basketProductIds, products: [] })
      }
    }
  }


  // ── PHASE 2: Single unified query ─────────────────────────────────────────
  let query = supabase
    .from('products')
    .select('*')
    .eq('deleted', false)
  
  // Narrow to search candidates if a search term was provided
  if (candidateIds !== null) {
    query = query.in('id', candidateIds)
  }

  // Structural filters (sex, price) — always AND, no ambiguity
  if (sex && ['men', 'women', 'unisex'].includes(sex)) {
  if (sex === 'unisex') {
    query = query.eq('sex', 'unisex')
  } else {
    query = query.or(`sex.eq.${sex},sex.eq.unisex`)
  }
}
  if (minPrice) query = query.gte('price', parseInt(minPrice))
  if (maxPrice) query = query.lte('price', parseInt(maxPrice))

  // ── Chip filters (JSONB containment) ──────────────────────────────────────
  //
  // Each group is AND with other groups (stacked .filter calls).
  // Within a group, multiple selected values are OR (any match is enough).
  //
  // Syntax: .filter('keywords->colors', 'cs', '["Red"]')
  // cs = contains (PostgreSQL @> operator on jsonb)
  // For OR within a group: we use a raw RPC or filter per value then merge.
  //
  // PostgREST limitation: chained .or() calls within the same column AND
  // together by default when mixed with .filter(). The cleanest approach
  // is .filter() with cs for single selections, and for multi-select within
  // a group we collect matching IDs in JS and use .in() — this guarantees
  // correct OR semantics regardless of PostgREST version.
  //
  // For single chip selections (most common case), .filter cs works perfectly.
  // For multi-chip within a group, we OR the IDs in memory.
  //
  // We use a helper: if only one value selected → .filter cs
  //                  if multiple → we'll resolve per-group below
  //
  // Actually the cleanest universal approach: always use .filter cs per value
  // then intersect IDs in memory for the OR-within-group case.
  // This is reliable, clear, and works regardless of Supabase version.

  // Helper: for each chip group, if multiple values selected we need OR logic.
  // We resolve this by building the query with single-value .filter() for each,
  // then if multiple values exist we run parallel queries and union the IDs.
  //
  // For now: single selected value → direct .filter()
  //          multiple → we OR them as JSON array containment check in raw filter

  const applyChipFilter = (
    qb: any,
    field: string,
    values: string[]
  ) => {
    if (values.length === 0) return qb
    if (values.length === 1) {
      // Single value: clean containment check
      return qb.filter(`keywords->${field}`, 'cs', `["${values[0]}"]`)
    }
    // Multiple values: OR within group using contains on array with all values
    // PostgreSQL: keywords->'colors' @> '["Red"]' OR keywords->'colors' @> '["Blue"]'
    // In PostgREST this is expressed as an or() with filter syntax
    const orParts = values.map(v => `keywords->${field}.cs.["${v}"]`).join(',')
    return qb.or(orParts)
  }

  query = applyChipFilter(query, 'colors',     colorList)
  query = applyChipFilter(query, 'materials',  materialList)
  query = applyChipFilter(query, 'patterns',   patternList)
  query = applyChipFilter(query, 'categories', categoryList)
  query = applyChipFilter(query, 'occasions',  occasionList)
  query = applyChipFilter(query, 'sizes',      sizeList)

  // ── Sorting ──────────────────────────────────────────────────────────────
  // When a search is active and no explicit sort is chosen, we skip DB-level
  // ordering and sort in JS after fetch using trigram scores.
  // This ensures "red casual shirt" surfaces the best-matching products first.
  // When no search is active, the existing price/date/interleave logic runs.
  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true })
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false })
  } else if (!q) {
    // No search — use default price+date ordering for the DB query
    query = query.order('price', { ascending: false })
    query = query.order('created_at', { ascending: true })
  }
  // If q is set and no explicit sort: we'll sort by trigram score in JS below
   
  let results = await query
  let products = results?.data??[]
   
  // ── Relevance sort when searching (overrides DB order) ────────────────────
  // Products are re-sorted by their trigram similarity score descending.
  // A product matching "red", "casual", AND "shirt" scores much higher than
  // one matching only "red" — so it naturally floats to the top.
  // If trigram wasn't used (Tier 2/3 fired), we fall back to word-match count
  // so results are still meaningfully ordered.
   if (q && !sort && products && products.length > 0) {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)

    const weightedScore = (p: Product): number => {
      const kw = (p.keywords ?? {}) as Record<string, string[]>
      let score = 0
      for (const word of words) {
        if (kw.colors?.some(v => v.toLowerCase().includes(word)))     score += 2
        if (kw.categories?.some(v => v.toLowerCase().includes(word))) score += 3
        for (const field of ['materials', 'patterns', 'occasions'] as const) {
          if ((kw[field] as string[] | undefined)?.some(v => v.toLowerCase().includes(word))) score += 1
        }
        if ((p.name ?? '').toLowerCase().includes(word)) score += 0.5
      }
      return score
    }

    products = [...products].sort((a, b) => {
      const aVec = vectorScoreMap.get(a.id) ?? 0
      const bVec = vectorScoreMap.get(b.id) ?? 0
      if (Math.abs(bVec - aVec) > 0.07) return bVec - aVec
      return weightedScore(b) - weightedScore(a)
    })
  }


  // ── Default interleave (only when browsing with no search and no sort) ─────
  if (!sort && !q) {
    const female  = products?.filter(p => p.sex === 'women' ) ?? []
    const male    = products?.filter(p => p.sex === 'men' )    ?? []
    const unisex  = products?.filter(p => p.sex === 'unisex') ?? []
    const part = (items: Product[], half: 0 | 1) =>
      half === 0
        ? items.slice(0, Math.floor(items.length / 2))
        : items.slice(Math.floor(items.length / 2))
    products = [
      ...part(female, 0), ...part(male, 0),
      ...part(female, 1), ...part(male, 1),
      ...unisex,
    ]
  }
let initialQuery =  supabase
    .from('products')
    .select('*')
    .eq('deleted', false)  
const result = await initialQuery;
const initialProducts = result?.data ?? [];

// 1. Create the lookup set from existing products
const existingIds = new Set(products.map(p => p.id));

// 2. Filter out the ones we already have and merge
const uniqueNewProducts = initialProducts.filter(p => !existingIds.has(p.id));

// 3. Update the list (Immutable way)
const updatedProducts = [...products, ...uniqueNewProducts];
  // ── New arrivals filter (unchanged) ───────────────────────────────────────
  const filteredProducts = newProducts === 'true'
    ? updatedProducts?.filter(p => isProductNew(p.created_at))
    : updatedProducts
 
  return renderPage({ isAdmin, filterOptions, basketProductIds, products: filteredProducts ?? [] })
}

// ── Render (unchanged) ────────────────────────────────────────────────────────
function renderPage({
  isAdmin,
  filterOptions,
  basketProductIds,
  products,
}: {
  isAdmin: boolean
  filterOptions: Record<string, string[]>
  basketProductIds: Set<string>
  products: Product[]
}) {
  return (
    <div className="container mx-auto px-4 py-8 page-content">
      <div className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <div className="bg-gradient-to-r from-[#D4AF37] to-[#7A1E2C] rounded-2xl p-8 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">RP Apparels</h1>
            <p className="text-xl opacity-90 max-w-2xl">Fashion in Vogue</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/baskets"
                className="bg-white text-[#7A1E2C] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition text-center w-full sm:w-auto"
              >
                View My Basket
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="bg-[#7A1E2C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#5A1620] transition text-center w-full sm:w-auto"
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="mb-8">
          <ProductSearchAndFilters filterOptions={filterOptions} />
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            Featured Products
          </h2>
          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-1 opacity-70">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isInBasket={basketProductIds.has(product.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function renderLoader(){
      
}