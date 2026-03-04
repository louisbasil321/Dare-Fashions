'use server'

import { createClient } from '@/lib/supabase/server'

export async function getFilterOptions() {
  const supabase = await createClient()
  const groups = ['colors', 'materials', 'patterns', 'categories', 'occasions', 'sizes'] as const
  const result: Record<string, string[]> = {}

  for (const group of groups) {
    const { data } = await supabase
      .from('products')
      .select(`keywords->${group}`)
      .not('keywords', 'is', null)

    const all = data?.flatMap(item => {
      const raw = (item as any)[group]
      if (!raw) return []

      // JSONB arrow select returns values as a JSON string — parse it if needed
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          return [raw] // already a plain string value, use as-is
        }
      }

      // Already a proper array (some Supabase versions return parsed JSONB)
      if (Array.isArray(raw)) return raw

      return []
    }) || []

    const unique = Array.from(new Set(all.filter(Boolean))).sort() as string[]
    result[group] = unique
  }

  return result
}