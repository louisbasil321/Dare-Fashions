// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/utils' // adjust path

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/shop'
  const baseUrl = getBaseUrl()

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const guestSessionId = cookieStore.get('guest_session_id')?.value

      if (guestSessionId) {
        // Use the helper for the base URL
        const mergeUrl = new URL('/auth/merge', baseUrl)
        mergeUrl.searchParams.set('next', next)
        return NextResponse.redirect(mergeUrl)
      }

      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${baseUrl}/auth/auth-code-error`)
}